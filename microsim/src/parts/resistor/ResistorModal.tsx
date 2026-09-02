import { useState, useEffect } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function ResistorModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const storeResistance = (livePart?.properties?.resistance as number) ?? 220;
  const [localResistance, setLocalResistance] = useState<string>(String(storeResistance));

  useEffect(() => {
    setLocalResistance(String(storeResistance));
  }, [storeResistance]);

  if (!livePart) return null;

  const handleResistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalResistance(val);

    const num = Number(val);
    if (val !== "" && !isNaN(num) && num >= 1) {
      updatePartProperties(livePart.id, { resistance: num });
    }
  };

  const handleResistanceBlur = () => {
    const num = Number(localResistance);
    if (localResistance === "" || isNaN(num) || num < 1) {
      setLocalResistance("220");
      updatePartProperties(livePart.id, { resistance: 220 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e22] border border-[#333338] rounded-xl p-5 w-80 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold capitalize text-sky-400">{livePart.type} Properties</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-400">Resistance (Ω)</label>
          <div className="relative">
            <input
              type="number"
              min={1}
              max={10_000_000}
              value={localResistance}
              onChange={handleResistanceChange}
              onBlur={handleResistanceBlur}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500 pr-8"
              placeholder="Enter resistance e.g. 220"
            />
            <span className="absolute right-3 top-2 text-xs text-zinc-500 pointer-events-none font-semibold">Ω</span>
          </div>
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