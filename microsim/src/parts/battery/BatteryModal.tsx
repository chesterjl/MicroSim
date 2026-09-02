import { useState, useEffect } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function BatteryModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));
  
  const storeVoltage = (livePart?.properties?.voltage as number) ?? 9;
  const [localVoltage, setLocalVoltage] = useState<string>(String(storeVoltage));

  useEffect(() => {
    setLocalVoltage(String(storeVoltage));
  }, [storeVoltage]);

  if (!livePart) return null;

  const commitVoltage = (raw: string) => {
    const num = Number(raw);
    if (raw !== "" && !isNaN(num)) {
      updatePartProperties(livePart.id, { voltage: Math.min(15, Math.max(0, num)) });
    }
  };

  const handleVoltageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalVoltage(val);
    const num = Number(val);
    if (val !== "" && !isNaN(num) && num >= 0 && num <= 15) {
      updatePartProperties(livePart.id, { voltage: num });
    }
  };

  const handleVoltageBlur = () => {
    const num = Number(localVoltage);
    const clamped = localVoltage === "" || isNaN(num) ? 9 : Math.min(15, Math.max(0, num));
    setLocalVoltage(String(clamped));
    updatePartProperties(livePart.id, { voltage: clamped });
  };

  const handleVoltageSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVoltage(e.target.value);
    commitVoltage(e.target.value);
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
          <label className="block text-xs font-medium text-zinc-400">Voltage (V)</label>

          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={Number(localVoltage) || 0}
            onChange={handleVoltageSlider}
            className="w-full accent-sky-500"
          />

          <div className="relative">
            <input
              type="number"
              min={0}
              max={15}
              step={0.5}
              value={localVoltage}
              onChange={handleVoltageChange}
              onBlur={handleVoltageBlur}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500 pr-8"
              placeholder="Enter voltage e.g. 9"
            />
            <span className="absolute right-3 top-2 text-xs text-zinc-500 pointer-events-none font-semibold">V</span>
          </div>

          <p className="text-[11px] text-zinc-500">0V = dead battery — connected parts won't power on.</p>
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