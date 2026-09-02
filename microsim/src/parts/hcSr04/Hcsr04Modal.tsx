import { useState, useEffect } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import { DEFAULT_ULTRASONIC_DISTANCE_CM } from "../../config/partDefinitions";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function UltrasonicHcsr04Modal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const storeDistanceCm = (livePart?.properties?.distanceCm as number) ?? DEFAULT_ULTRASONIC_DISTANCE_CM;
  const [localDistanceCm, setLocalDistanceCm] = useState<string>(String(storeDistanceCm));

  useEffect(() => {
    setLocalDistanceCm(String(storeDistanceCm));
  }, [storeDistanceCm]);

  if (!livePart) return null;

  const commitDistance = (raw: string) => {
    const num = Number(raw);
    if (raw !== "" && !isNaN(num)) {
      updatePartProperties(livePart.id, { distanceCm: Math.min(400, Math.max(0, num)) });
    }
  };

  const handleDistanceSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalDistanceCm(e.target.value);
    commitDistance(e.target.value);
  };

  const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalDistanceCm(val);
    const num = Number(val);
    if (val !== "" && !isNaN(num) && num >= 0 && num <= 400) {
      updatePartProperties(livePart.id, { distanceCm: num });
    }
  };

  const handleDistanceBlur = () => {
    const num = Number(localDistanceCm);
    const clamped =
      localDistanceCm === "" || isNaN(num)
        ? DEFAULT_ULTRASONIC_DISTANCE_CM
        : Math.min(400, Math.max(0, num));
    setLocalDistanceCm(String(clamped));
    updatePartProperties(livePart.id, { distanceCm: clamped });
  };

  const handleDone = () => {
    handleDistanceBlur();
    onClose();
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
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-zinc-400">Simulated Distance</label>
              <span className="text-xs text-sky-400 font-mono">{localDistanceCm} cm</span>
            </div>
            <input
              type="range"
              min={0}
              max={400}
              step={1}
              value={localDistanceCm}
              onChange={handleDistanceSlider}
              className="w-full accent-sky-500"
            />
            <div className="relative">
              <input
                type="number"
                min={0}
                max={400}
                value={localDistanceCm}
                onChange={handleDistanceChange}
                onBlur={handleDistanceBlur}
                className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500 pr-10"
                placeholder="e.g. 50"
              />
              <span className="absolute right-3 top-2 text-xs text-zinc-500 pointer-events-none font-semibold">cm</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Measures the distance to an object using ultrasonic sound waves.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleDone}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}