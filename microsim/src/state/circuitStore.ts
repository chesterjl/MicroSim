import { create } from "zustand";
import { nanoid } from "nanoid";
import {
  CPU,
  avrInstruction,
  portBConfig,
  portDConfig,
  AVRUSART,
  AVRIOPort,
  AVRTimer,
  timer0Config,
  timer1Config,
  timer2Config,
  AVRADC,
  adcConfig,
  usart0Config,
  PinState,
} from "avr8js";
import type { PartInstance, PinRef, Wire } from "../types/types";
import { createPartInstance } from "../partDefinitions";
import { buildNetlist } from "../netlist";
import type { Netlist } from "../netlist";
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
 * One HC-SR04 wired (directly OR through a breadboard) into the running
 * circuit. Trigger detection uses the port's own change listener, which
 * fires precisely as the compiled code writes the pin -- that part is
 * already cycle-accurate. Ending the echo pulse at the right *time* is the
 * hard part: a full animation frame is ~16ms of chip time, but a real echo
 * pulse for a typical reading only lasts a few milliseconds, so checking
 * only once per frame would make distance readings wildly wrong. That's
 * why `updateEcho()` gets called many times per frame, in small
 * instruction chunks, from the main loop below -- not on a timer.
 */
interface UltrasonicRig {
  trigPin: number;
  echoPin: number;
  updateEcho: () => void;
}

function setupUltrasonicRigs(
  cpu: CPU,
  portB: AVRIOPort,
  portD: AVRIOPort,
  parts: PartInstance[],
  wires: Wire[],
  digitalPins: Record<number, { mode: "INPUT" | "OUTPUT"; value: "HIGH" | "LOW" }>
): UltrasonicRig[] {
  // One-time netlist build purely to resolve wiring topology -- which
  // Arduino pin each sensor's trig/echo actually lands on, and whether the
  // sensor is actually powered. This correctly accounts for breadboard
  // internal bridging (columns, rails), unlike a raw search through the
  // `wires` array, which only sees direct part-to-part wires and misses
  // anything routed through a breadboard -- which is how these are
  // virtually always wired in practice.
  const wiringNetlist: Netlist = buildNetlist(parts, wires, digitalPins, true);
  const arduinoPart = parts.find((p) => p.type === "arduino-uno");
  if (!arduinoPart) return [];

  const rigs: UltrasonicRig[] = [];

  for (const part of parts) {
    if (part.type !== "ultrasonic-hcsr04") continue;

    const trigPin = wiringNetlist.getConnectedArduinoPin(part.id, "trig");
    const echoPin = wiringNetlist.getConnectedArduinoPin(part.id, "echo");
    if (trigPin === null || echoPin === null) continue; // not wired to the Arduino at all, nothing to simulate

    const powered = wiringNetlist.isPowered(part.id);
    const { port: trigPort, bit: trigBit } = getPortAndBit(trigPin, portB, portD);
    const { port: echoPort, bit: echoBit } = getPortAndBit(echoPin, portB, portD);

    let triggeredAtCycle: number | null = null;
    let lastTrigHigh = false;

    trigPort.addListener(() => {
      if (!powered) return;
      const isHigh = trigPort.pinState(trigBit) === PinState.High;
      if (isHigh && !lastTrigHigh) {
        triggeredAtCycle = cpu.cycles;
        echoPort.setPin(echoBit, true);
      }
      lastTrigHigh = isHigh;
    });

    rigs.push({
      trigPin,
      echoPin,
      updateEcho: () => {
        if (triggeredAtCycle === null) return;
        // Standard HC-SR04 formula: pulse duration (us) = distance(cm) * 58.
        // Read distanceCm live on every check (not just at trigger time) so
        // adjusting it mid-run via the properties modal takes effect on
        // the next trigger cycle without needing to restart the sim.
        const distanceCm = Number(part.properties?.distanceCm ?? 400);
        const pulseCycles = Math.round(distanceCm * 58 * 16); // 16 cycles/us at 16MHz
        if (cpu.cycles - triggeredAtCycle >= pulseCycles) {
          echoPort.setPin(echoBit, false);
          triggeredAtCycle = null;
        }
      },
    });
  }

  return rigs;
}

/**
 * Forces external circuit state into any Arduino pin currently configured
 * as INPUT (e.g. a pushbutton, or anything else read via digitalRead()).
 * Without this, digitalRead() only ever sees avr8js's own internal
 * default -- it has no way to know what your netlist says is actually
 * wired to that pin. Runs once per frame; pins claimed by an
 * UltrasonicRig are excluded since those need the finer per-chunk timing
 * above instead, and this coarser per-frame pass would fight with it.
 */
function syncSimpleDigitalInputs(
  netlist: Netlist,
  arduinoId: string,
  portB: AVRIOPort,
  portD: AVRIOPort,
  excludePins: Set<number>
) {
  for (let pin = 0; pin <= 13; pin++) {
    if (excludePins.has(pin)) continue;
    const { port, bit } = getPortAndBit(pin, portB, portD);
    const currentState = port.pinState(bit);
    const isInputMode = currentState === PinState.Input || currentState === PinState.InputPullUp;
    if (!isInputMode) continue;

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

      // FIXED: was a raw wires-array search that only found DIRECT
      // sensor-to-Arduino wires, missing anything routed through a
      // breadboard (the normal case). Now uses the netlist's full wiring
      // resolution, which understands breadboard internal bridging too.
      const ultrasonicRigs = setupUltrasonicRigs(
        cpu,
        portB,
        portD,
        initialState.parts,
        initialState.wires,
        initialState.digitalPins
      );
      const ultrasonicClaimedPins = new Set(ultrasonicRigs.flatMap((r) => [r.trigPin, r.echoPin]));

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

      // FIXED: the previous version tried to live-update the console's
      // LAST array entry on every single character, which -- after the
      // first completed line -- ended up overwriting that just-finished
      // line instead of starting a new one, corrupting the log. This is
      // simpler and correct: just accumulate characters, and only touch
      // consoleLog once a full line (terminated by '\n') is ready.
      usart.onByteTransmit = (value: number) => {
        console.log("[USART TX]", value, JSON.stringify(String.fromCharCode(value))); // TEMP — remove after debugging
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
      // FIXED: previously the whole frame's ~266,666 instructions ran in
      // one uninterrupted synchronous loop, so nothing could update the
      // echo pin's state until the entire frame finished -- far too
      // coarse for a pulse that's supposed to last only a few
      // milliseconds. Running in small chunks and re-checking ultrasonic
      // timing between each one gives resolution on the order of a few
      // microseconds instead of ~16 milliseconds.
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

            syncSimpleDigitalInputs(frameNetlist, activeArduino.id, portB, portD, ultrasonicClaimedPins);
          }

          let remaining = instructionsPerFrame;
          while (remaining > 0) {
            const batch = Math.min(CHUNK_SIZE, remaining);
            for (let i = 0; i < batch; i++) {
              avrInstruction(cpu);
                cpu.tick(); 
            }
            remaining -= batch;

            for (const rig of ultrasonicRigs) rig.updateEcho();
          }

          if (Math.random() < 0.05) { // sample ~5% of frames so this doesn't flood the console
            console.log("[CPU state]", { pc: cpu.pc, cycles: cpu.cycles });
          }
        } catch (err) {
          // TEMP -- this is the diagnostic. Whatever prints here is the real bug.
          console.error("[executeFrame crashed]", err);
          pushLog(`[Simulation crashed: ${err instanceof Error ? err.message : String(err)}]`);
          set({ running: false });
          return; // stop requesting further frames instead of silently looping into the same crash
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