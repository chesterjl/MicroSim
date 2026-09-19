import { create } from "zustand";
import { nanoid } from "nanoid";
import type { PartInstance, PinRef, Wire } from "../types/types";
import { GRID } from "../types/types";
import { createPartInstance } from "../config/partDefinitions";
import { DEFAULT_SKETCH } from "../constants/constant";
import { IR_BUTTON_CODES } from "../engine/device/irReceiverDevice";
import { removeBuzzerVoice } from "../engine/device/buzzerVoice";
import { AVRRunner, type LcdScreenState, type BuzzerState } from "../engine/avrRunner";
import type { DigitalPinState } from "../engine/componentModel";

interface HistorySnapshot {
  parts: PartInstance[];
  wires: Wire[];
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
  digitalPins: Record<number, DigitalPinState>;
  consoleLog: string[];
  lcdScreens: Record<string, LcdScreenState>;
  buzzerStates: Record<string, BuzzerState>;
  servoAngles: Record<string, number>;

  // Undo/redo only ever holds {parts, wires} snapshots
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  undo: () => void;
  redo: () => void;

  addPart: (type: string, x: number, y: number) => void;

  // historyKey lets a caller mark a run of movePart calls (e.g. every
  // mousemove tick of one drag) as "the same logical edit" so they
  // coalesce into a single undo step. Defaults to `id` if omitted.
  movePart: (id: string, x: number, y: number, historyKey?: string) => void;
  selectPart: (id: string | null) => void;
  deletePart: (id: string) => void;
  deleteSelected: () => void;
  togglePushbutton: (id: string) => void;
  toggleSwitch: (id: string) => void;
  pressIrButton: (id: string, buttonKey: string) => void;
  updatePartProperties: (id: string, patch: Record<string, unknown>) => void;

  rotatePart: (id: string) => void;
  duplicatePart: (id: string) => void;

  startWire: (pin: PinRef) => void;
  addWaypoint: (point: { x: number; y: number }) => void;
  finishWire: (pin: PinRef) => void;
  cancelWire: () => void;
  deleteWire: (id: string) => void;
  removeWiresForPart: (partId: string) => void;
  updateWireColor: (id: string, color: string) => void;
  shiftWireWaypoints: (partId: string, dx: number, dy: number, historyKey?: string) => void;

  setCode: (code: string) => void;
  runSimulation: () => Promise<void>;
  stopSimulation: () => void;
}

function clearTransientDamage(parts: PartInstance[]): PartInstance[] {
  return parts.map((p) => {
    const isCapacitor = p.type === "capacitor-polarized" || p.type === "capacitor-nonpolarized";
    const wasDamaged = Boolean(p.properties?.destroyed);

    if (!isCapacitor && !wasDamaged) return p;

    return {
      ...p,
      properties: {
        ...p.properties,
        ...(isCapacitor ? { storedVoltage: 0 } : {}),
        ...(wasDamaged ? { destroyed: false, destroyedReason: undefined } : {}),
      },
    };
  });
}

export const useCircuitStore = create<CircuitState>((set, get) => {
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

  // Undo/redo bookkeeping
  // Only parts and wires are ever snapshotted - simulation runtime state is intentionally excluded.
  //
  // lastHistoryKey / lastHistoryTime live in this closure (created once,
  // when the store is built) rather than in reactive state, same pattern
  // as `activeAnimationId` used to live outside the old store - they're
  // bookkeeping for recordHistory, not UI-facing state.
  const MAX_HISTORY = 50;
  const HISTORY_COALESCE_MS = 400;
  let lastHistoryKey: string | null = null;
  let lastHistoryTime = 0;

  // Call BEFORE mutating parts/wires. Pass `null` for a discrete action
  // (always pushes a fresh snapshot). Pass a stable key for a continuous
  // action (drag, slider) - repeated calls with the same key inside the
  // coalesce window collapse into the one snapshot taken at the start of
  // that gesture, so undo reverts the whole gesture in one step.
  function recordHistory(historyKey: string | null) {
    const now = Date.now();
    if (historyKey !== null && historyKey === lastHistoryKey && now - lastHistoryTime < HISTORY_COALESCE_MS) {
      lastHistoryTime = now; // still the same gesture - extend the window
      return;
    }
    lastHistoryKey = historyKey;
    lastHistoryTime = now;

    const state = get();
    set({
      undoStack: [...state.undoStack, { parts: state.parts, wires: state.wires }].slice(-MAX_HISTORY),
      redoStack: [],
    });
  }

  return {
    parts: [],
    wires: [],
    selectedPartId: null,
    pendingWireStart: null,
    draftWaypoints: [],
    undoStack: [],
    redoStack: [],

    connectPins: (a, b) => {
      recordHistory(null);
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
      recordHistory(null);
      const id = nanoid(6);
      const part = createPartInstance(type, x, y, id);
      set((state) => ({ parts: [...state.parts, part], selectedPartId: part.id }));
    },

    movePart: (id, x, y, historyKey) => {
      recordHistory(historyKey ?? id);
      set((state) => ({
        parts: state.parts.map((p) => (p.id === id ? { ...p, x, y } : p)),
      }));
    },

    selectPart: (id) => set({ selectedPartId: id }),

    deletePart: (id) => {
      recordHistory(null);
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
      recordHistory(null);
      set((state) => ({
        parts: state.parts.map((p) =>
          p.id === id ? { ...p, properties: { ...p.properties, pressed: !p.properties.pressed } } : p
        ),
      }));
    },

    toggleSwitch: (id) => {
      recordHistory(null);
      set((state) => ({
        parts: state.parts.map((p) =>
          p.id === id ? { ...p, properties: { ...p.properties, on: !p.properties.on } } : p
        ),
      }));
    },

    pressIrButton: (id, buttonKey) => {
      const code = IR_BUTTON_CODES[buttonKey];
      if (code === undefined) return;
      recordHistory(null);
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
      // Coalesced per-part -- so dragging a modal slider (many onChange
      // calls) undoes as one step, not one step per pixel.
      recordHistory(`props:${id}`);
      set((state) => ({
        parts: state.parts.map((p) =>
          p.id === id ? { ...p, properties: { ...p.properties, ...patch } } : p
        ),
      }));
    },

    rotatePart: (id) => {
      if (get().running) return;
      recordHistory(null);
      set((state) => ({
        parts: state.parts.map((p) =>
          p.id === id
            ? { ...p, rotation: (((p.rotation + 90) % 360) as PartInstance["rotation"]) }
            : p
        ),
      }));
    },

    duplicatePart: (id) => {
      if (get().running) return;
      const original = get().parts.find((p) => p.id === id);
      if (!original) return;

      recordHistory(null);

      const newPart: PartInstance = {
        ...original,
        id: `${original.type}-${nanoid(6)}`,
        x: original.x + 2 * GRID,
        y: original.y + 2 * GRID,
        properties: { ...original.properties },
      };

      set((state) => ({
        parts: [...state.parts, newPart],
        selectedPartId: newPart.id,
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

      recordHistory(null);

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
      recordHistory(null);
      set((state) => ({ wires: state.wires.filter((w) => w.id !== id) }));
    },

    removeWiresForPart: (partId) => {
      recordHistory(null);
      set((state) => ({
        wires: state.wires.filter((w) => w.from.partId !== partId && w.to.partId !== partId),
      }));
    },

    updateWireColor: (id, color) => {
      recordHistory(null);
      set((state) => ({
        wires: state.wires.map((w) => (w.id === id ? { ...w, color } : w)),
      }));
    },

    shiftWireWaypoints: (partId, dx, dy, historyKey) => {
      if (dx === 0 && dy === 0) return;
      recordHistory(historyKey ?? partId);
      set((state) => ({
        wires: state.wires.map((w) => {
          const touchesPart = w.from.partId === partId || w.to.partId === partId;
          if (!touchesPart || !w.waypoints || w.waypoints.length === 0) return w;
          return {
            ...w,
            waypoints: w.waypoints.map((wp) => ({ x: wp.x + dx, y: wp.y + dy })),
          };
        }),
      }));
    },

    undo: () => {
      const { undoStack, parts, wires, running } = get();
      if (running || undoStack.length === 0) return;

      const previous = undoStack[undoStack.length - 1];
      set((state) => ({
        parts: previous.parts,
        wires: previous.wires,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, { parts, wires }],
        // Clear selection/wire-draft so nothing points at a part/pin that
        // undo just made stale (e.g. undoing an addPart or a wire delete).
        selectedPartId: null,
        pendingWireStart: null,
        draftWaypoints: [],
      }));
      lastHistoryKey = null; // next edit after an undo should always push fresh
    },

    redo: () => {
      const { redoStack, parts, wires, running } = get();
      if (running || redoStack.length === 0) return;

      const next = redoStack[redoStack.length - 1];
      set((state) => ({
        parts: next.parts,
        wires: next.wires,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, { parts, wires }],
        selectedPartId: null,
        pendingWireStart: null,
        draftWaypoints: [],
      }));
      lastHistoryKey = null;
    },

    setCode: (code) => set({ code }),

    runSimulation: async () => {
      set((s) => ({ parts: clearTransientDamage(s.parts) }));

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
      set((s) => ({
        parts: clearTransientDamage(s.parts),
        running: false,
        consoleLog: [],
        lcdScreens: {},
        buzzerStates: {},
        servoAngles: {},
      }));
    },
  };
});