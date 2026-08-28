import { create } from "zustand";
import { nanoid } from "nanoid";
import {CPU,avrInstruction,portBConfig,portDConfig,AVRUSART,AVRIOPort,AVRTimer,timer0Config,timer1Config,timer2Config,AVRADC,adcConfig,usart0Config,AVRTWI,twiConfig,PinState,} from "avr8js";
import type { PartInstance, PinRef, Wire } from "../types/types";
import { createPartInstance } from "../config/partDefinitions";
import { buildNetlist } from "../engine/netlist";
import type { Netlist } from "../engine/netlist";
import { DEFAULT_SKETCH } from "../constants/constant";
import { createI2CBus, createHd44780Device } from "../engine/i2cLcdDevice";
import type { I2CDevice } from "../engine/i2cLcdDevice";
import { setBuzzerTone, stopBuzzerTone, stopAllBuzzers, removeBuzzerVoice } from "../engine/buzzerVoice.ts";
import { createServoDevice } from "../engine/servoDevice";
import type { ServoExternalDevice } from "../engine/servoDevice";

interface LcdScreenState {
  lines: [string, string];
  backlightOn: boolean;
}

interface BuzzerState {
  active: boolean;
  frequency: number; // Hz -- 0 means silent
}

interface CircuitState {
  parts: PartInstance[];
  wires: Wire[];
  selectedPartId: string | null;
  pendingWireStart: PinRef | null;
  connectPins: (a: PinRef, b: PinRef) => void;
  draftWaypoints: { x: number; y: number }[];

  code: string;
  running: boolean;
  runToken: number;
  digitalPins: Record<number, { mode: "INPUT" | "OUTPUT"; value: "HIGH" | "LOW" }>;
  consoleLog: string[];
  lcdScreens: Record<string, LcdScreenState>;
  buzzerStates: Record<string, BuzzerState>;
  servoAngles: Record<string, number>;

  addPart: (type: string, x: number, y: number) => void;
  movePart: (id: string, x: number, y: number) => void;
  selectPart: (id: string | null) => void;
  deletePart: (id: string) => void;
  deleteSelected: () => void;
  togglePushbutton: (id: string) => void;
  updatePartProperties: (id: string, patch: Record<string, unknown>) => void;

  startWire: (pin: PinRef) => void;
  addWaypoint: (point: { x: number; y: number }) => void;
  finishWire: (pin: PinRef) => void;
  cancelWire: () => void;
  deleteWire: (id: string) => void;
  removeWiresForPart: (partId: string) => void;
  updateWireColor: (id: string, color: string) => void;

  setCode: (code: string) => void;
  runSimulation: () => Promise<void>;
  stopSimulation: () => void;
}

let activeAnimationId: number | null = null;

async function compileSketch(code: string): Promise<string> {
  const response = await fetch("http://localhost:3001/api/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error);
  }

  return data.hex;
}

function loadHexToProgmem(hex: string, progmem: Uint8Array) {
  for (const line of hex.split("\n")) {
    if (line.startsWith(":")) {
      const bytes = parseInt(line.substring(1, 3), 16);
      const addr = parseInt(line.substring(3, 7), 16);
      const type = parseInt(line.substring(7, 9), 16);
      if (type === 0) {
        for (let i = 0; i < bytes; i++) {
          progmem[addr + i] = parseInt(line.substring(9 + i * 2, 11 + i * 2), 16);
        }
      }
    }
  }
}

function getPortAndBit(pin: number, portB: AVRIOPort, portD: AVRIOPort): { port: AVRIOPort; bit: number } {
  return pin <= 7 ? { port: portD, bit: pin } : { port: portB, bit: pin - 8 };
}

interface ExternalDevice {
  claimedPins: number[];
  update: (cpu: CPU) => void;
}

function createUltrasonicDevice(
  portB: AVRIOPort,
  portD: AVRIOPort,
  partId: string,
  trigPin: number,
  echoPin: number,
  powered: boolean
): ExternalDevice {
  const { port: trigPort, bit: trigBit } = getPortAndBit(trigPin, portB, portD);
  const { port: echoPort, bit: echoBit } = getPortAndBit(echoPin, portB, portD);

  type EchoState = "idle" | "pending" | "echoing";
  let state: EchoState = "idle";
  let stateChangedAtCycle = 0;
  let lastTrigHigh = false;
  let echoHigh = false;
  let echoDistanceCm = 400;

  const TRIGGER_TO_ECHO_DELAY_CYCLES = Math.round(150 * 16);

  const setEcho = (high: boolean) => {
    if (echoHigh === high) return;
    echoHigh = high;
    echoPort.setPin(echoBit, high);
  };

  trigPort.addListener(() => {
    if (!powered) return;
    const isHigh = trigPort.pinState(trigBit) === PinState.High;
    if (isHigh && !lastTrigHigh && state === "idle") {
      state = "pending";
      stateChangedAtCycle = 0;
    }
    lastTrigHigh = isHigh;
  });

  let justTriggered = false;
  trigPort.addListener(() => {
    if (!powered) return;
    if (state === "pending" && stateChangedAtCycle === 0) justTriggered = true;
  });

  return {
    claimedPins: [trigPin, echoPin],
    update: (cpu: CPU) => {
      if (state === "pending") {
        if (justTriggered) {
          stateChangedAtCycle = cpu.cycles;
          justTriggered = false;
        }
        if (stateChangedAtCycle > 0 && cpu.cycles - stateChangedAtCycle >= TRIGGER_TO_ECHO_DELAY_CYCLES) {
          setEcho(true);
          state = "echoing";
          stateChangedAtCycle = cpu.cycles;

          const livePart = useCircuitStore.getState().parts.find((p) => p.id === partId);
          echoDistanceCm = Math.max(0, Math.min(400, Number(livePart?.properties?.distanceCm ?? 400)));
        }
      } else if (state === "echoing") {
        const pulseCycles = Math.round(echoDistanceCm * 58 * 16);
        if (cpu.cycles - stateChangedAtCycle >= pulseCycles) {
          setEcho(false);
          state = "idle";
        }
      }
    },
  };
}

/**
 * Passive buzzer -- no internal oscillator, so it only makes sound if the
 * connected pin is actively toggling (e.g. via tone()). Measures the
 * cycle count between consecutive edges (any direction) on the port's
 * own change listener -- the same cycle-accurate technique already used
 * for the ultrasonic sensor's trigger detection -- and derives frequency
 * from that, since sampling digitalPins once per ~16ms animation frame
 * is far too coarse to see an audio-rate square wave at all.
 */
function createPassiveBuzzerDevice(
  portB: AVRIOPort,
  portD: AVRIOPort,
  partId: string,
  signalPin: number,
  onFrequencyChange: (partId: string, frequencyHz: number) => void
): ExternalDevice {
  const { port, bit } = getPortAndBit(signalPin, portB, portD);

  let lastLevel = port.pinState(bit) === PinState.High;
  let edgePending = false;
  let lastEdgeCycle: number | null = null;
  let currentFrequency = 0;
  let lastActivityCycle = 0;

  // If nothing toggles for this long, treat the buzzer as silent -- covers
  // noTone() and the end of a timed tone(pin, freq, duration) call.
  const SILENCE_TIMEOUT_CYCLES = Math.round(16_000_000 * 0.05); // 50ms

  port.addListener(() => {
    const level = port.pinState(bit) === PinState.High;
    if (level !== lastLevel) edgePending = true;
    lastLevel = level;
  });

  return {
    claimedPins: [signalPin],
    update: (cpu: CPU) => {
      if (edgePending) {
        edgePending = false;
        if (lastEdgeCycle !== null) {
          const halfPeriodCycles = cpu.cycles - lastEdgeCycle;
          if (halfPeriodCycles > 0) {
            const freq = 16_000_000 / (2 * halfPeriodCycles);
            // Ignore absurd values (startup glitches, one-off DDR flips)
            // and skip redundant updates to avoid spamming the store.
            if (freq >= 20 && freq <= 20000) {
              const rounded = Math.round(freq);
              if (rounded !== currentFrequency) {
                currentFrequency = rounded;
                onFrequencyChange(partId, currentFrequency);
              }
            }
          }
        }
        lastEdgeCycle = cpu.cycles;
        lastActivityCycle = cpu.cycles;
      } else if (currentFrequency > 0 && cpu.cycles - lastActivityCycle > SILENCE_TIMEOUT_CYCLES) {
        currentFrequency = 0;
        onFrequencyChange(partId, 0);
      }
    },
  };
}

function setupExternalDevices(
  portB: AVRIOPort,
  portD: AVRIOPort,
  parts: PartInstance[],
  wires: Wire[],
  digitalPins: Record<number, { mode: "INPUT" | "OUTPUT"; value: "HIGH" | "LOW" }>
): ExternalDevice[] {
  const wiringNetlist: Netlist = buildNetlist(parts, wires, digitalPins, true);
  const arduinoPart = parts.find((p) => p.type === "arduino-uno");
  if (!arduinoPart) return [];

  const devices: ExternalDevice[] = [];

  for (const part of parts) {
    if (part.type === "ultrasonic-hcsr04") {
      const trigPin = wiringNetlist.getConnectedArduinoPin(part.id, "trig");
      const echoPin = wiringNetlist.getConnectedArduinoPin(part.id, "echo");
      if (trigPin === null || echoPin === null) continue;

      const powered = wiringNetlist.isPowered(part.id);
      devices.push(createUltrasonicDevice(portB, portD, part.id, trigPin, echoPin, powered));
    }
  }

  return devices;
}

/**
 * Discovers every passive buzzer wired to the Arduino and builds its
 * frequency-detection device. Tries both legs since either could be the
 * signal pin depending on how it was wired (the other leg goes to GND).
 * Kept as its own setup function (like the LCD's) rather than folded into
 * setupExternalDevices, since it needs its own onFrequencyChange callback
 * shape.
 */
function setupPassiveBuzzerDevices(
  portB: AVRIOPort,
  portD: AVRIOPort,
  parts: PartInstance[],
  wires: Wire[],
  digitalPins: Record<number, { mode: "INPUT" | "OUTPUT"; value: "HIGH" | "LOW" }>,
  onFrequencyChange: (partId: string, frequencyHz: number) => void
): ExternalDevice[] {
  const wiringNetlist: Netlist = buildNetlist(parts, wires, digitalPins, true);
  const devices: ExternalDevice[] = [];

  for (const part of parts) {
    if (part.type !== "passive-buzzer") continue;

    const posPin = wiringNetlist.getConnectedArduinoPin(part.id, "positive");
    const negPin = wiringNetlist.getConnectedArduinoPin(part.id, "negative");
    const signalPin = posPin ?? negPin;
    if (signalPin === null) continue;

    devices.push(createPassiveBuzzerDevice(portB, portD, part.id, signalPin, onFrequencyChange));
  }

  return devices;
}

function setupServoDevices(
  portB: AVRIOPort,
  portD: AVRIOPort,
  parts: PartInstance[],
  wires: Wire[],
  digitalPins: Record<number, { mode: "INPUT" | "OUTPUT"; value: "HIGH" | "LOW" }>,
  onAngleChange: (partId: string, angleDegrees: number) => void
): ServoExternalDevice[] {
  const wiringNetlist: Netlist = buildNetlist(parts, wires, digitalPins, true);
  const devices: ServoExternalDevice[] = [];

  for (const part of parts) {
    if (part.type !== "servo-mg90") continue; // must match the type string exactly

    const signalPin = wiringNetlist.getConnectedArduinoPin(part.id, "signal");
    if (signalPin === null) continue;

    const { port, bit } = getPortAndBit(signalPin, portB, portD);
    devices.push(
      createServoDevice(port, bit, signalPin, (angle) => onAngleChange(part.id, angle))
    );
  }

  return devices;
}

/**
 * Builds the I2C bus's device list -- currently just LCD screens, one per
 * "lcd-16x2-i2c" part in the circuit that's actually powered (VCC + GND
 * reach real power/ground). Unlike the ultrasonic sensor, I2C's SDA/SCL
 * are the ATmega328's FIXED hardware pins (A4/A5) -- AVRTWI talks to
 * those registers directly, not through a generic port pin the way
 * digitalWrite()-driven pins do. So we don't need to resolve which
 * Arduino pin SDA/SCL land on the way we did for trig/echo; we only need
 * to know the device is powered.
 */
function setupLcdI2CDevices(
  parts: PartInstance[],
  wires: Wire[],
  digitalPins: Record<number, { mode: "INPUT" | "OUTPUT"; value: "HIGH" | "LOW" }>,
  onScreenChange: (partId: string, lines: [string, string], backlightOn: boolean) => void
): I2CDevice[] {
  const wiringNetlist: Netlist = buildNetlist(parts, wires, digitalPins, true);
  const devices: I2CDevice[] = [];

  for (const part of parts) {
    if (part.type !== "lcd-16x2-i2c") continue;
    const powered = wiringNetlist.isPowered(part.id);
    if (!powered) continue;

    const address = 0x27; // matches LiquidCrystal_I2C lcd(0x27, 16, 2) -- the standard default address
    devices.push(
      createHd44780Device(address, (lines, backlightOn) => {
        onScreenChange(part.id, lines, backlightOn);
      })
    );
  }

  return devices;
}

function syncSimpleDigitalInputs(
  netlist: Netlist,
  arduinoId: string,
  cpu: CPU,
  portB: AVRIOPort,
  portD: AVRIOPort,
  excludePins: Set<number>
) {
  for (let pin = 0; pin <= 13; pin++) {
    if (excludePins.has(pin)) continue;

    let isOutput: boolean;
    if (pin <= 7) {
      isOutput = (cpu.data[0x0a] & (1 << pin)) !== 0;
    } else {
      isOutput = (cpu.data[0x04] & (1 << (pin - 8))) !== 0;
    }
    if (isOutput) continue;

    const { port, bit } = getPortAndBit(pin, portB, portD);
    const netState = netlist.getPinState(arduinoId, `d${pin}`);
    if (netState === "floating") continue;
    port.setPin(bit, netState === "high");
  }
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
  parts: [],
  wires: [],
  selectedPartId: null,
  pendingWireStart: null,
  draftWaypoints: [],
  connectPins: (a, b) => {
    set((state) => ({
      wires: [...state.wires, { id: nanoid(6), from: a, to: b }],
    }));
  },

  code: DEFAULT_SKETCH,
  running: false,
  runToken: 0,
  digitalPins: {},
  consoleLog: [],
  lcdScreens: {},
  buzzerStates: {},
  servoAngles: {},  

  addPart: (type, x, y) => {
    const id = nanoid(6);
    const part = createPartInstance(type, x, y, id);
    set((state) => ({ parts: [...state.parts, part], selectedPartId: part.id }));
  },

  movePart: (id, x, y) => {
    set((state) => ({
      parts: state.parts.map((p) => (p.id === id ? { ...p, x, y } : p)),
    }));
  },

  selectPart: (id) => set({ selectedPartId: id }),

  deletePart: (id) => {
    removeBuzzerVoice(id); // no-op if id isn't a buzzer / nothing playing
    set((state) => ({
      parts: state.parts.filter((p) => p.id !== id),
      wires: state.wires.filter((w) => w.from.partId !== id && w.to.partId !== id),
      selectedPartId: state.selectedPartId === id ? null : state.selectedPartId,
    }));
  },

  deleteSelected: () => {
    const { selectedPartId, deletePart } = get();
    if (selectedPartId) deletePart(selectedPartId);
  },

  togglePushbutton: (id) => {
    set((state) => ({
      parts: state.parts.map((p) =>
        p.id === id ? { ...p, properties: { ...p.properties, pressed: !p.properties.pressed } } : p
      ),
    }));
  },

  updatePartProperties: (id, patch) => {
    set((state) => ({
      parts: state.parts.map((p) =>
        p.id === id ? { ...p, properties: { ...p.properties, ...patch } } : p
      ),
    }));
  },

  startWire: (pin) => set({ pendingWireStart: pin, draftWaypoints: [] }),

  addWaypoint: (point) =>
    set((state) => ({
      draftWaypoints: [...state.draftWaypoints, point],
    })),

  finishWire: (pin) => {
    const { pendingWireStart, wires, draftWaypoints } = get();
    if (!pendingWireStart) return;

    if (pendingWireStart.partId === pin.partId && pendingWireStart.pinId === pin.pinId) {
      set({ pendingWireStart: null, draftWaypoints: [] });
      return;
    }

    const wire: Wire = {
      id: nanoid(6),
      from: pendingWireStart,
      to: pin,
      waypoints: draftWaypoints,
    };
    set({ wires: [...wires, wire], pendingWireStart: null, draftWaypoints: [] });
  },

  cancelWire: () => set({ pendingWireStart: null, draftWaypoints: [] }),

  deleteWire: (id) => {
    set((state) => ({ wires: state.wires.filter((w) => w.id !== id) }));
  },

  removeWiresForPart: (partId) => {
    set((state) => ({
      wires: state.wires.filter((w) => w.from.partId !== partId && w.to.partId !== partId),
    }));
  },

  updateWireColor: (id, color) =>
    set((state) => ({
      wires: state.wires.map((w) => (w.id === id ? { ...w, color } : w)),
    })),

  setCode: (code) => set({ code }),

  runSimulation: async () => {
    get().stopSimulation();
    stopAllBuzzers();

    const token = get().runToken + 1;
    set({ running: true, runToken: token, consoleLog: ["[Compiling sketch...]"], lcdScreens: {}, buzzerStates: {}, servoAngles: {} });
    
    const pushLog = (line: string) => set((s) => ({ consoleLog: [...s.consoleLog.slice(-99), line] }));

    try {
      const hex = await compileSketch(get().code);
      if (!get().running || get().runToken !== token) return;

      pushLog("[Compilation successful. Initializing AVR CPU...]");

      const progmem = new Uint8Array(32768);
      loadHexToProgmem(hex, progmem);

      const cpu = new CPU(new Uint16Array(progmem.buffer));

      const portB = new AVRIOPort(cpu, portBConfig);
      const portD = new AVRIOPort(cpu, portDConfig);

      new AVRTimer(cpu, timer0Config);
      new AVRTimer(cpu, timer1Config);
      new AVRTimer(cpu, timer2Config);

      const adc = new AVRADC(cpu, adcConfig);

      const initialState = get();
      const ultrasonicDevices = setupExternalDevices(
        portB,
        portD,
        initialState.parts,
        initialState.wires,
        initialState.digitalPins
      );

      // --- Passive buzzer setup -----------------------------------------
      const passiveBuzzerDevices = setupPassiveBuzzerDevices(
        portB,
        portD,
        initialState.parts,
        initialState.wires,
        initialState.digitalPins,
        (partId, frequencyHz) => {
          set((s) => ({
            buzzerStates: {
              ...s.buzzerStates,
              [partId]: { active: frequencyHz > 0, frequency: frequencyHz },
            },
          }));
          setBuzzerTone(partId, frequencyHz);
        }
      );

      const servoDevices = setupServoDevices(
        portB,
        portD,
        initialState.parts,
        initialState.wires,
        initialState.digitalPins,
        (partId, angle) => {
          console.log("[servo] angle", partId, angle);
          set((s) => ({ servoAngles: { ...s.servoAngles, [partId]: angle } }));
        }
      );

      const externalDevices = [...ultrasonicDevices, ...passiveBuzzerDevices, ...servoDevices];
      const claimedPins = new Set(externalDevices.flatMap((d) => d.claimedPins));

      // --- I2C / LCD setup ---------------------------------------------
      const lcdI2CDevices = setupLcdI2CDevices(
        initialState.parts,
        initialState.wires,
        initialState.digitalPins,
        (partId, lines, backlightOn) => {
          set((s) => ({
            lcdScreens: { ...s.lcdScreens, [partId]: { lines, backlightOn } },
          }));
        }
      );

      if (lcdI2CDevices.length > 0) {
        const twi = new AVRTWI(cpu, twiConfig, 16000000);

        console.log("[I2C] TWI prototype:", Object.getOwnPropertyNames(Object.getPrototypeOf(twi)));
        console.log("[I2C] TWI own keys:", Object.keys(twi));
        console.log("[I2C] TWI eventHandler:", (twi as any).eventHandler);

        const bus = createI2CBus(lcdI2CDevices);

        // These wrap the bus so we can see exactly what's happening on
        // the wire, and (critically, confirmed working) call the
        // matching `complete*` method on `twi` after each bus response --
        // AVRTWI's real API expects the event handler to report back
        // asynchronously via these rather than just returning a value.
        const wrappedBus = {
          start: (repeated: boolean) => {
            console.log("[I2C] start", { repeated });
            bus.start();
            twi.completeStart();
          },

          stop: () => {
            console.log("[I2C] stop");
            bus.stop();
            twi.completeStop();
          },

          connectToSlave: (addr: number, write: boolean) => {
            console.log("[I2C] connectToSlave", { addr: addr.toString(16), write });
            const ack = bus.connectToSlave(addr, write);
            console.log("[I2C] ACK:", ack);
            twi.completeConnect(ack);
          },

          writeByte: (value: number) => {
            console.log("[I2C] writeByte", value.toString(16));
            const ack = bus.writeByte(value);
            twi.completeWrite(ack);
          },

          readByte: (ack: boolean) => {
            console.log("[I2C] readByte", { ack });
            const value = bus.readByte(ack);
            twi.completeRead(value);
          },
        };

        (twi as unknown as { eventHandler: typeof wrappedBus }).eventHandler = wrappedBus;
      }
      // -------------------------------------------------------------------

      const updatePinState = () => {
        const nextPins: Record<number, { mode: "INPUT" | "OUTPUT"; value: "HIGH" | "LOW" }> = {};

        for (let pin = 0; pin <= 7; pin++) {
          const pinVal = portD.pinState(pin);
          const isOutput = pinVal === PinState.Low || pinVal === PinState.High;
          const isHigh = pinVal === PinState.High || pinVal === PinState.InputPullUp;
          nextPins[pin] = { mode: isOutput ? "OUTPUT" : "INPUT", value: isHigh ? "HIGH" : "LOW" };
        }

        for (let pin = 0; pin <= 5; pin++) {
          const arduinoPin = pin + 8;
          const pinVal = portB.pinState(pin);
          const isOutput = pinVal === PinState.Low || pinVal === PinState.High;
          const isHigh = pinVal === PinState.High || pinVal === PinState.InputPullUp;
          nextPins[arduinoPin] = { mode: isOutput ? "OUTPUT" : "INPUT", value: isHigh ? "HIGH" : "LOW" };
        }

        set({ digitalPins: nextPins });
      };

      portB.addListener(updatePinState);
      portD.addListener(updatePinState);
      updatePinState();

      const usart = new AVRUSART(cpu, usart0Config, 16000000);
      let serialLineBuffer = "";

      usart.onByteTransmit = (value: number) => {
        const char = String.fromCharCode(value);
        if (char === "\r") return;
        if (char === "\n") {
          pushLog(serialLineBuffer);
          serialLineBuffer = "";
        } else {
          serialLineBuffer += char;
        }
      };

      const speed = 16000000;
      const instructionsPerFrame = speed / 60;
      const CHUNK_SIZE = 100;

      const executeFrame = () => {
        if (!get().running || get().runToken !== token) return;

        try {
          const currentState = get();
          const activeArduino = currentState.parts.find((p) => p.type === "arduino-uno");

          if (activeArduino) {
            const frameNetlist = buildNetlist(currentState.parts, currentState.wires, currentState.digitalPins, true);

            for (let i = 0; i <= 5; i++) {
              adc.channelValues[i] = frameNetlist.getAnalogVoltage(activeArduino.id, `a${i}`);
            }

            syncSimpleDigitalInputs(frameNetlist, activeArduino.id, cpu, portB, portD, claimedPins);

            // --- Active buzzer: simple DC forward-bias check, no CPU-cycle
            // precision needed (fixed internal tone, just on/off). ---
            for (const part of currentState.parts) {
              if (part.type !== "active-buzzer") continue;
              const isSounding = frameNetlist.isActiveBuzzerSounding(part.id);
              const toneHz = Number(part.properties?.toneHz ?? 2500);
              const nextActive = isSounding;
              const nextFrequency = isSounding ? toneHz : 0;
              const prev = currentState.buzzerStates[part.id];
              if (!prev || prev.active !== nextActive || prev.frequency !== nextFrequency) {
                set((s) => ({
                  buzzerStates: {
                    ...s.buzzerStates,
                    [part.id]: { active: nextActive, frequency: nextFrequency },
                  },
                }));
                if (nextActive) {
                  setBuzzerTone(part.id, nextFrequency);
                } else {
                  stopBuzzerTone(part.id);
                }
              }
            }
          }

          let remaining = instructionsPerFrame;
          while (remaining > 0) {
            const batch = Math.min(CHUNK_SIZE, remaining);
            for (let i = 0; i < batch; i++) {
              avrInstruction(cpu);
              cpu.tick();
              for (const device of externalDevices) device.update(cpu);
            }
            remaining -= batch;
          }
        } catch (err) {
          console.error("[executeFrame crashed]", err);
          pushLog(`[Simulation crashed: ${err instanceof Error ? err.message : String(err)}]`);
          set({ running: false });
          return;
        }

        activeAnimationId = requestAnimationFrame(executeFrame);
      };

      activeAnimationId = requestAnimationFrame(executeFrame);
    } catch (err) {
      pushLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
      set({ running: false });
    }
  },

  stopSimulation: () => {
    if (activeAnimationId !== null) {
      cancelAnimationFrame(activeAnimationId);
      activeAnimationId = null;
    }
    stopAllBuzzers();
    set({ running: false });
  },
}));