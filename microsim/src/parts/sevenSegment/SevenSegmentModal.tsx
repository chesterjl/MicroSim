import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function SevenSegmentModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  if (!livePart) return null;

  const commonType = (livePart.properties?.commonType as string) ?? "cathode";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e22] border border-[#333338] rounded-xl p-5 w-80 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold text-sky-400">7-Segment Display Properties</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-400">Common Pin Type</label>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updatePartProperties(livePart.id, { commonType: "cathode" })}
              className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                commonType === "cathode"
                  ? "bg-sky-500/15 border-sky-500 text-sky-400"
                  : "bg-[#121214] border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              Common Cathode
            </button>

            <button
              onClick={() => updatePartProperties(livePart.id, { commonType: "anode" })}
              className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                commonType === "anode"
                  ? "bg-sky-500/15 border-sky-500 text-sky-400"
                  : "bg-[#121214] border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              Common Anode
            </button>
          </div>

          <p className="text-[11px] text-zinc-500">
            {commonType === "cathode"
              ? "COM pins connect to GND. Segment pins go HIGH to light."
              : "COM pins connect to 5V. Segment pins go LOW to light."}
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}