import { useState, useEffect } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

const CAPACITANCE_UNITS = ["F", "mF", "µF", "nF", "pF"] as const;

export function CapacitorModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const isPolarized = livePart?.type === "capacitor-polarized";

  const storeValue = (livePart?.properties?.capacitanceValue as number) ?? 100;
  const storeUnit = (livePart?.properties?.capacitanceUnit as string) ?? (isPolarized ? "µF" : "nF");
  const storeVoltageRating = (livePart?.properties?.voltageRating as number) ?? 16;

  const [localValue, setLocalValue] = useState<string>(String(storeValue));
  const [localUnit, setLocalUnit] = useState<string>(storeUnit);
  const [localVoltageRating, setLocalVoltageRating] = useState<string>(String(storeVoltageRating));

  useEffect(() => {
    setLocalValue(String(storeValue));
    setLocalUnit(storeUnit);
    setLocalVoltageRating(String(storeVoltageRating));
  }, [storeValue, storeUnit, storeVoltageRating]);

  if (!livePart) return null;

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    const num = Number(val);
    if (val !== "" && !isNaN(num) && num > 0) {
      updatePartProperties(livePart.id, { capacitanceValue: num });
    }
  };

  const handleValueBlur = () => {
    const num = Number(localValue);
    if (localValue === "" || isNaN(num) || num <= 0) {
      setLocalValue("100");
      updatePartProperties(livePart.id, { capacitanceValue: 100 });
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalUnit(e.target.value);
    updatePartProperties(livePart.id, { capacitanceUnit: e.target.value });
  };

  const handleVoltageRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalVoltageRating(val);
    const num = Number(val);
    if (val !== "" && !isNaN(num) && num >= 1) {
      updatePartProperties(livePart.id, { voltageRating: num });
    }
  };

  const handleVoltageRatingBlur = () => {
    const num = Number(localVoltageRating);
    if (localVoltageRating === "" || isNaN(num) || num < 1) {
      setLocalVoltageRating("16");
      updatePartProperties(livePart.id, { voltageRating: 16 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e22] border border-[#333338] rounded-xl p-5 w-80 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold text-sky-400">
            {isPolarized ? "Polarized Capacitor" : "Ceramic Capacitor"} Properties
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Capacitance</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0.001}
                value={localValue}
                onChange={handleValueChange}
                onBlur={handleValueBlur}
                className="flex-1 bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
                placeholder="e.g. 100"
              />
              <select
                value={localUnit}
                onChange={handleUnitChange}
                className="bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
              >
                {CAPACITANCE_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {isPolarized ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">Voltage Rating (V)</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={localVoltageRating}
                  onChange={handleVoltageRatingChange}
                  onBlur={handleVoltageRatingBlur}
                  className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500 pr-8"
                  placeholder="e.g. 16"
                />
                <span className="absolute right-3 top-2 text-xs text-zinc-500 pointer-events-none font-semibold">V</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Has polarity — reversing it (or exceeding this rating) is where you'd hook a future "damaged capacitor" state.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500">
              Ceramic capacitors are non-polarized — either direction is fine, and there's no voltage rating.
            </p>
          )}

          <p className="text-[11px] text-zinc-500">
            Stored charge: {((livePart.properties?.storedVoltage as number) ?? 0).toFixed(2)}V
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