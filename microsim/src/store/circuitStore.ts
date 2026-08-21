import { create } from "zustand";
import { nanoid } from "nanoid";
import { CPU, avrInstruction, portBConfig, portDConfig, AVRUSART, AVRIOPort, AVRTimer, timer0Config, timer1Config, timer2Config, AVRADC, adcConfig, usart0Config, PinState } from "avr8js";
import type { PartInstance, PinRef, Wire } from "../types/types";
import { createPartInstance } from "../config/partDefinitions";
import { buildNetlist } from "../engine/netlist";
import type { Netlist } from "../engine/netlist";
import { DEFAULT_SKETCH } from "../constants/constant";

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

/**
 * A device that lives "outside" the AVR chip and needs to react to /
 * drive pin state as the CPU runs -- an ultrasonic sensor's echo timing,
 * a debounced button, a DHT11's single-wire protocol, a servo's expected
 * feedback pulse, etc. `claimedPins` lets the generic per-frame input
 * sync below automatically skip any pin a device is already managing at
 * finer resolution, without executeFrame needing to know that specific
 * device type exists.
 */
interface ExternalDevice {
  claimedPins: number[];
  update: (cpu: CPU) => void;
}

/**
 * HC-SR04 ultrasonic sensor. Trigger detection uses the port's own change
 * listener (fires exactly when the compiled code writes the pin -- already
 * cycle-accurate). The pulse itself is a small state machine:
 * idle --(trig rising edge)--> pending --(~150us)--> echoing --(distance-based duration)--> idle
 */
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
        }
      } else if (state === "echoing") {
        // Fetch live part properties directly from the store on each cycle update
        const livePart = useCircuitStore.getState().parts.find((p) => p.id === partId);
        const distanceCm = Math.max(0, Math.min(400, Number(livePart?.properties?.distanceCm ?? 400)));
        
        const pulseCycles = Math.round(distanceCm * 58 * 16); // 58us/cm at 16 cycles/us
        if (cpu.cycles - stateChangedAtCycle >= pulseCycles) {
          setEcho(false);
          state = "idle";
        }
      }
    },
  };
}
/**
 * Discovers every part in the circuit that needs its own ExternalDevice
 * and builds them. Adding a new sensor type later means adding one
 * `createXDevice(...)` factory plus one branch here -- executeFrame's main
 * loop never needs to change again, since it just iterates whatever comes
 * back from this function.
 */
function setupExternalDevices(
  portB: AVRIOPort,
  portD: AVRIOPort,
  parts: PartInstance[],
  wires: Wire[],
  digitalPins: Record<number, { mode: "INPUT" | "OUTPUT"; value: "HIGH" | "LOW" }>
): ExternalDevice[] {
  // One-time netlist build purely to resolve wiring topology -- which
  // Arduino pin each device's pins actually land on, and whether each is
  // powered. Correctly accounts for breadboard internal bridging (columns,
  // rails), unlike a raw search through `wires`, which only sees direct
  // part-to-part wires and misses anything routed through a breadboard --
  // which is how these are virtually always wired in practice.
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
      // Pass part.id instead of part
      devices.push(createUltrasonicDevice(portB, portD, part.id, trigPin, echoPin, powered));
    }
  }

  return devices;
}

/**
 * Forces external circuit state into any Arduino pin currently configured
 * as INPUT (e.g. a pushbutton, or anything else read via digitalRead())
 * that ISN'T already claimed by an ExternalDevice above. Without this,
 * digitalRead() only ever sees avr8js's own internal default -- it has no
 * way to know what your netlist says is actually wired to that pin. Runs
 * once per frame; that's plenty for something like a button, which
 * doesn't need microsecond timing the way an ultrasonic echo pulse does.
 */
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

    // Read the DDR register bit directly to determine INPUT vs OUTPUT --
    // more reliable than inferring it from PinState, since an externally
    // forced INPUT pin can report the same High/Low state an OUTPUT pin
    // would.
    let isOutput: boolean;
    if (pin <= 7) {
      isOutput = (cpu.data[0x0a] & (1 << pin)) !== 0; // DDRD
    } else {
      isOutput = (cpu.data[0x04] & (1 << (pin - 8))) !== 0; // DDRB
    }
    if (isOutput) continue;

    const { port, bit } = getPortAndBit(pin, portB, portD);
    const netState = netlist.getPinState(arduinoId, `d${pin}`);
    if (netState === "floating") continue; // let avr8js's own internal pull-up/float behavior stand
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

    const token = get().runToken + 1;
    set({ running: true, runToken: token, consoleLog: ["[Compiling sketch...]"] });

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

      // Hardware timers -- enable millis(), delay(), and PWM output.
      new AVRTimer(cpu, timer0Config);
      new AVRTimer(cpu, timer1Config);
      new AVRTimer(cpu, timer2Config);

      const adc = new AVRADC(cpu, adcConfig);

      const initialState = get();
      const externalDevices = setupExternalDevices(
        portB,
        portD,
        initialState.parts,
        initialState.wires,
        initialState.digitalPins
      );
      const claimedPins = new Set(externalDevices.flatMap((d) => d.claimedPins));

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
    set({ running: false });
  },
}));
