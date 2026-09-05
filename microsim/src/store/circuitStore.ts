import { create } from "zustand";
import { nanoid } from "nanoid";
import type { PartInstance, PinRef, Wire } from "../types/types";
import { createPartInstance } from "../config/partDefinitions";
import { DEFAULT_SKETCH } from "../constants/constant";
import { IR_BUTTON_CODES } from "../engine/device/irReceiverDevice";
import { removeBuzzerVoice } from "../engine/device/buzzerVoice";
import { AVRRunner, type LcdScreenState, type BuzzerState } from "../engine/avrRunner";

interface CircuitState {
  parts: PartInstance[];
  wires: Wire[];
  selectedPartId: string | null;
  pendingWireStart: PinRef | null;
  connectPins: (a: PinRef, b: PinRef) => void;
  draftWaypoints: { x: number; y: number }[];
  
  code: string;
  running: boolean;
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
  toggleSwitch: (id: string) => void;
  pressIrButton: (id: string, buttonKey: string) => void;
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

export const useCircuitStore = create<CircuitState>((set, get) => {
  // The runner is pure execution machinery -- it knows nothing about
  // Zustand. Every callback below is just wiring: read circuit/derived
  // state via `get()`, write results back via `set()`.
  const runner = new AVRRunner({
    getCircuit: () => {
      const s = get();
      return { parts: s.parts, wires: s.wires, digitalPins: s.digitalPins };
    },

    getBuzzerState: (partId) => get().buzzerStates[partId],

    getStepperAngle: (partId) => {
      const part = get().parts.find((p) => p.id === partId);
      return Number(part?.properties?.rotorAngleDeg ?? 0);
    },

    getKeypadState: (partId) => {
      const part = get().parts.find((p) => p.id === partId);
      return {
        row: typeof part?.properties?.pressedRow === "number" ? part.properties.pressedRow : null,
        col: typeof part?.properties?.pressedCol === "number" ? part.properties.pressedCol : null,
      };
    },

    onLog: (line) => set((s) => ({ consoleLog: [...s.consoleLog.slice(-99), line] })),

    onDigitalPinsChange: (pins) => set({ digitalPins: pins }),

    onLcdScreenChange: (partId, cells, cgram, backlightOn) =>
      set((s) => ({
        lcdScreens: { ...s.lcdScreens, [partId]: { cells, cgram, backlightOn } },
      })),

    onBuzzerStateChange: (partId, state) =>
      set((s) => ({ buzzerStates: { ...s.buzzerStates, [partId]: state } })),

    onServoAngleChange: (partId, angle) =>
      set((s) => ({ servoAngles: { ...s.servoAngles, [partId]: angle } })),

    onStepperAngleChange: (partId, angle) => get().updatePartProperties(partId, { rotorAngleDeg: angle }),

    onCapacitorVoltageChange: (partId, voltage) => get().updatePartProperties(partId, { storedVoltage: voltage }),

    onCompileError: (message) => {
      set((s) => ({ consoleLog: [...s.consoleLog.slice(-99), `Error: ${message}`], running: false }));
    },

    onCrash: (message) => {
      set((s) => ({
        consoleLog: [...s.consoleLog.slice(-99), `[Simulation crashed: ${message}]`],
        running: false,
      }));
    },
  });

  return {
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
      removeBuzzerVoice(id);
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

    toggleSwitch: (id) => {
      set((state) => ({
        parts: state.parts.map((p) =>
          p.id === id ? { ...p, properties: { ...p.properties, on: !p.properties.on } } : p
        ),
      }));
    },

    pressIrButton: (id, buttonKey) => {
      const code = IR_BUTTON_CODES[buttonKey];
      if (code === undefined) return;
      set((state) => ({
        parts: state.parts.map((p) =>
          p.id === id
            ? {
                ...p,
                properties: {
                  ...p.properties,
                  lastButton: buttonKey,
                  lastCode: code,
                  sentToken: Number(p.properties?.sentToken ?? 0) + 1,
                },
              }
            : p
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
      // Reset capacitors and per-run derived state before compiling.
      set((s) => ({
        parts: s.parts.map((p) =>
          p.type === "capacitor-polarized" || p.type === "capacitor-nonpolarized"
            ? { ...p, properties: { ...p.properties, storedVoltage: 0 } }
            : p
        ),
      }));

      set({
        running: true,
        consoleLog: ["[Compiling sketch...]"],
        lcdScreens: {},
        buzzerStates: {},
        servoAngles: {},
      });

      await runner.start(get().code);
    },

    stopSimulation: () => {
      runner.stop();
      set({ running: false });
    },
  };
});