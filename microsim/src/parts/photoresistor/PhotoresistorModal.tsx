import { useState, useEffect } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function PhotoresistorModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const storeLightLevel = (livePart?.properties?.lightLevel as number) ?? 0.5;
  const [localPercent, setLocalPercent] = useState<string>(String(Math.round(storeLightLevel * 100)));

  useEffect(() => {
    setLocalPercent(String(Math.round(storeLightLevel * 100)));
  }, [storeLightLevel]);

  if (!livePart) return null;

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPercent(e.target.value);
    updatePartProperties(livePart.id, { lightLevel: Number(e.target.value) / 100 });
  };

  const setPreset = (percent: number) => {
    setLocalPercent(String(percent));
    updatePartProperties(livePart.id, { lightLevel: percent / 100 });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e22] border border-[#333338] rounded-xl p-5 w-80 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold capitalize text-sky-400">Photoresistor Properties</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-zinc-400">Ambient Light</label>
              <span className="text-xs text-sky-400 font-mono">{localPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={localPercent}
              onChange={handleSlider}
              className="w-full accent-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPreset(0)}
              className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
            >
              Dark
            </button>
            <button onClick={() => setPreset(100)}
              className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
            >
              Bright Light
            </button>
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