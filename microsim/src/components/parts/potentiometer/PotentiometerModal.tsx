import { useState, useEffect } from "react";
import { useCircuitStore } from "../../../store/circuitStore";
import type { PartInstance } from "../../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function PotentiometerModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const storeMaxResistance = (livePart?.properties?.maxResistance as number) ?? 10000;
  const [localMaxResistance, setLocalMaxResistance] = useState<string>(String(storeMaxResistance));

  const storeWiperPosition = (livePart?.properties?.wiperPosition as number) ?? 0.5;
  const [localWiperPercent, setLocalWiperPercent] = useState<string>(String(Math.round(storeWiperPosition * 100)));

  useEffect(() => {
    setLocalMaxResistance(String(storeMaxResistance));
  }, [storeMaxResistance]);

  useEffect(() => {
    setLocalWiperPercent(String(Math.round(storeWiperPosition * 100)));
  }, [storeWiperPosition]);

  if (!livePart) return null;

  const handleMaxResistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalMaxResistance(val);
    const num = Number(val);
    if (val !== "" && !isNaN(num) && num >= 1) {
      updatePartProperties(livePart.id, { maxResistance: num });
    }
  };

  const handleMaxResistanceBlur = () => {
    const num = Number(localMaxResistance);
    if (localMaxResistance === "" || isNaN(num) || num < 1) {
      setLocalMaxResistance("10000");
      updatePartProperties(livePart.id, { maxResistance: 10000 });
    }
  };

  const handleWiperSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalWiperPercent(e.target.value);
    const percent = Number(e.target.value);
    updatePartProperties(livePart.id, { wiperPosition: percent / 100 });
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

        <div className="space-y-4">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-400">Max Resistance (Ω)</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={10_000_000}
                value={localMaxResistance}
                onChange={handleMaxResistanceChange}
                onBlur={handleMaxResistanceBlur}
                className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500 pr-8"
                placeholder="Enter rated value e.g. 10000"
              />
              <span className="absolute right-3 top-2 text-xs text-zinc-500 pointer-events-none font-semibold">Ω</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-zinc-400">Wiper Position</label>
              <span className="text-xs text-sky-400 font-mono">{localWiperPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={localWiperPercent}
              onChange={handleWiperSlider}
              className="w-full accent-sky-500"
            />
            <p className="text-[11px] text-zinc-500">
              Turns the knob — shifts how much of the rated resistance sits between the wiper and each outer pin.
            </p>
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