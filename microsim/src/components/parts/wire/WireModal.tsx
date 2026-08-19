import { createPortal } from "react-dom";
import type { Wire } from "../../../types/types";
import { useCircuitStore } from "../../../state/circuitStore";

const WIRE_COLORS = [
  { name: "Green", hex: "#22c55e" },
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Black", hex: "#18181b" },
  { name: "White", hex: "#f4f4f5" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#a855f7" },
];

interface Props {
  wire: Wire | null;
  onClose: () => void;
  onDeleteWire: (id: string) => void;
}

export function WireModal({ wire, onClose, onDeleteWire }: Props) {
  const updateWireColor = useCircuitStore((s) => s.updateWireColor);
  const liveWire = useCircuitStore((s) => s.wires.find((w) => w.id === wire?.id));

  if (!liveWire) return null;

  const activeColor = liveWire.color || "#22c55e";

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-[#1e1e22] border border-[#333338] rounded-xl p-5 w-80 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold text-sky-400">Wire Properties</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-400">Wire Color</label>
          <div className="grid grid-cols-4 gap-2">
            {WIRE_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => updateWireColor(liveWire.id, c.hex)}
                className={`h-8 rounded-lg border flex items-center justify-center transition-transform hover:scale-105 ${
                  activeColor === c.hex ? "border-sky-400 ring-2 ring-sky-500/50" : "border-zinc-700"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => {
              onDeleteWire(liveWire.id);
              onClose();
            }}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded text-xs font-medium transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}