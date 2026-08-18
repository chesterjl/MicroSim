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
import { DEFAULT_SKETCH } from "../interpreter";
import { buildNetlist } from "../netlist";

interface CircuitState {
  parts: PartInstance[];
  wires: Wire[];
  selectedPartId: string | null;
  pendingWireStart: PinRef | null;
  connectPins: (a: PinRef, b: PinRef) => void;

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
  finishWire: (pin: PinRef) => void;
  cancelWire: () => void;
  deleteWire: (id: string) => void;
  removeWiresForPart: (partId: string) => void;

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

// Helper to emulate HC-SR04 pulse behavior on hardware ports
function attachHCSR04Emulation(
  cpu: CPU,
  portB: AVRIOPort,
  portD: AVRIOPort,
  wires: Wire[],
  ultraPart: PartInstance,
  arduinoPartId: string
) {
  // Find which digital pins on Arduino are connected to TRIG and ECHO
  const findArduinoPin = (targetPinId: string): number | null => {
    const wire = wires.find(
      (w) =>
        (w.from.partId === ultraPart.id && w.from.pinId === targetPinId && w.to.partId === arduinoPartId) ||
        (w.to.partId === ultraPart.id && w.to.pinId === targetPinId && w.from.partId === arduinoPartId)
    );
    if (!wire) return null;
    const pinId = wire.from.partId === arduinoPartId ? wire.from.pinId : wire.to.pinId;
    const match = /^d(\d+)$/.exec(pinId);
    return match ? parseInt(match[1], 10) : null;
  };

  const trigPinNum = findArduinoPin("trig");
  const echoPinNum = findArduinoPin("echo");

  if (trigPinNum === null || echoPinNum === null) return;

  const distanceCm = (ultraPart.properties?.distanceCm as number) ?? 50;
  // Standard ultrasonic formula: pulse duration = distance in cm * 58 microseconds
  const pulseDurationUs = Math.round(distanceCm * 58);
  const pulseCycles = Math.round((pulseDurationUs * 16000000) / 1000000);

  const trigPort = trigPinNum >= 8 ? portB : portD;
  const echoPort = echoPinNum >= 8 ? portB : portD;
  const trigBit = trigPinNum >= 8 ? trigPinNum - 8 : trigPinNum;
  const echoBit = echoPinNum >= 8 ? echoPinNum - 8 : echoPinNum;

  let lastTrigState = PinState.Low;

  trigPort.addListener(() => {
    const currentTrigState = trigPort.pinState(trigBit);
    // Trigger on rising edge (LOW to HIGH transition)
    if (lastTrigState !== PinState.High && currentTrigState === PinState.High) {
      // Set ECHO Pin HIGH
      echoPort.setPin(echoBit, true);

      // Schedule ECHO Pin to return LOW after the calculated cycle duration
      const targetCycles = cpu.cycles + pulseCycles;
      const checkCycle = () => {
        if (cpu.cycles >= targetCycles) {
          echoPort.setPin(echoBit, false);
        } else {
          setTimeout(checkCycle, 1);
        }
      };
      checkCycle();
    }
    lastTrigState = currentTrigState;
  });
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
  parts: [],
  wires: [],
  selectedPartId: null,
  pendingWireStart: null,
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

  startWire: (pin) => set({ pendingWireStart: pin }),

  finishWire: (pin) => {
    const { pendingWireStart, wires } = get();
    if (!pendingWireStart) return;

    if (pendingWireStart.partId === pin.partId && pendingWireStart.pinId === pin.pinId) {
      set({ pendingWireStart: null });
      return;
    }

    const wire: Wire = { id: nanoid(6), from: pendingWireStart, to: pin };
    set({ wires: [...wires, wire], pendingWireStart: null });
  },

  cancelWire: () => set({ pendingWireStart: null }),

  deleteWire: (id) => {
    set((state) => ({ wires: state.wires.filter((w) => w.id !== id) }));
  },

  removeWiresForPart: (partId) => {
    set((state) => ({
      wires: state.wires.filter((w) => w.from.partId !== partId && w.to.partId !== partId),
    }));
  },

  setCode: (code) => set({ code }),

  runSimulation: async () => {
    get().stopSimulation();

    const token = get().runToken + 1;
    set({ running: true, runToken: token, consoleLog: ["[Compiling sketch...]"] });

    const pushLog = (line: string) =>
      set((s) => ({ consoleLog: [...s.consoleLog.slice(-99), line] }));

    try {
      const hex = await compileSketch(get().code);
      if (!get().running || get().runToken !== token) return;

      pushLog("[Compilation successful. Initializing AVR CPU...]");

      const progmem = new Uint8Array(32768);
      loadHexToProgmem(hex, progmem);

      const cpu = new CPU(new Uint16Array(progmem.buffer));

      const portB = new AVRIOPort(cpu, portBConfig);
      const portD = new AVRIOPort(cpu, portDConfig);

      // Hardware timers enabling millis(), delay(), and PWM output
      new AVRTimer(cpu, timer0Config);
      new AVRTimer(cpu, timer1Config);
      new AVRTimer(cpu, timer2Config);

      const adc = new AVRADC(cpu, adcConfig);

      // Attach HC-SR04 dynamic pin handling if ultrasonic module exists
      const state = get();
      const arduinoPart = state.parts.find((p) => p.type === "arduino-uno");
      const ultrasonicPart = state.parts.find((p) => p.type === "ultrasonic-hcsr04");

      if (arduinoPart && ultrasonicPart) {
        attachHCSR04Emulation(cpu, portB, portD, state.wires, ultrasonicPart, arduinoPart.id);
      }

      const updatePinState = () => {
        const nextPins: Record<number, { mode: "INPUT" | "OUTPUT"; value: "HIGH" | "LOW" }> = {};

        for (let pin = 0; pin <= 7; pin++) {
          const pinVal = portD.pinState(pin);
          const isOutput = pinVal === PinState.Low || pinVal === PinState.High;
          const isHigh = pinVal === PinState.High || pinVal === PinState.InputPullUp;

          nextPins[pin] = {
            mode: isOutput ? "OUTPUT" : "INPUT",
            value: isHigh ? "HIGH" : "LOW",
          };
        }

        for (let pin = 0; pin <= 5; pin++) {
          const arduinoPin = pin + 8;
          const pinVal = portB.pinState(pin);
          const isOutput = pinVal === PinState.Low || pinVal === PinState.High;
          const isHigh = pinVal === PinState.High || pinVal === PinState.InputPullUp;

          nextPins[arduinoPin] = {
            mode: isOutput ? "OUTPUT" : "INPUT",
            value: isHigh ? "HIGH" : "LOW",
          };
        }

        set({ digitalPins: nextPins });
      };

      portB.addListener(updatePinState);
      portD.addListener(updatePinState);

      updatePinState();

      const usart = new AVRUSART(cpu, usart0Config, 16000000);
      let serialLineBuffer = "";

      // Stream Serial.print() and Serial.println() live to terminal window
      usart.onByteTransmit = (value: number) => {
        const char = String.fromCharCode(value);

        if (char === "\r") return;

        if (char === "\n") {
          pushLog(serialLineBuffer);
          serialLineBuffer = "";
        } else {
          serialLineBuffer += char;
          set((s) => {
            const logs = [...s.consoleLog];
            if (logs.length === 0) return { consoleLog: [serialLineBuffer] };
            
            // Check if the current line being logged is actively building
            const lastIdx = logs.length - 1;
            const updatedLogs = [...logs];
            updatedLogs[lastIdx] = serialLineBuffer;
            return { consoleLog: updatedLogs };
          });
        }
      };

      const speed = 16000000;
      const instructionsPerFrame = speed / 60;

      const executeFrame = () => {
        if (!get().running || get().runToken !== token) return;

        const currentState = get();
        const activeArduino = currentState.parts.find((p) => p.type === "arduino-uno");
        if (activeArduino) {
          const netlist = buildNetlist(currentState.parts, currentState.wires, currentState.digitalPins, true);
          // Maps all 6 analog channels (A0 to A5)
          for (let i = 0; i <= 5; i++) {
            adc.channelValues[i] = netlist.getAnalogVoltage(activeArduino.id, `a${i}`);
          }
        }

        for (let i = 0; i < instructionsPerFrame; i++) {
          avrInstruction(cpu);
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