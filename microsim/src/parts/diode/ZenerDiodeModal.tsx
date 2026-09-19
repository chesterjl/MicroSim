import { useState, useEffect } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

// Common E24-series Zener voltages, for quick-pick convenience.
const COMMON_ZENER_VOLTAGES = [2.4, 3.3, 3.9, 4.7, 5.1, 5.6, 6.2, 6.8, 8.2, 9.1, 10, 12, 15, 18, 24];

export function ZenerDiodeModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const storeZenerVoltage = (livePart?.properties?.zenerVoltage as number) ?? 5.1;
  const storeMaxPowerWatts = (livePart?.properties?.maxPowerWatts as number) ?? 0.5;

  const [localZenerVoltage, setLocalZenerVoltage] = useState(String(storeZenerVoltage));
  const [localMaxPowerWatts, setLocalMaxPowerWatts] = useState(String(storeMaxPowerWatts));

  useEffect(() => {
    setLocalZenerVoltage(String(storeZenerVoltage));
    setLocalMaxPowerWatts(String(storeMaxPowerWatts));
  }, [storeZenerVoltage, storeMaxPowerWatts]);

  if (!livePart) return null;

  const commit = (patch: Record<string, unknown>) => updatePartProperties(livePart.id, patch);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e22] border border-[#333338] rounded-xl p-5 w-80 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold text-sky-400">Zener Diode Properties</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Zener Voltage (Vz)</label>
            <div className="relative">
              <input
                type="number"
                min={1.8}
                max={200}
                step={0.1}
                value={localZenerVoltage}
                onChange={(e) => {
                  setLocalZenerVoltage(e.target.value);
                  const n = Number(e.target.value);
                  if (e.target.value !== "" && !isNaN(n) && n > 0) commit({ zenerVoltage: n });
                }}
                onBlur={() => {
                  const n = Number(localZenerVoltage);
                  if (localZenerVoltage === "" || isNaN(n) || n <= 0) {
                    setLocalZenerVoltage("5.1");
                    commit({ zenerVoltage: 5.1 });
                  }
                }}
                className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500 pr-8"
              />
              <span className="absolute right-3 top-2 text-xs text-zinc-500 pointer-events-none font-semibold">V</span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_ZENER_VOLTAGES.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setLocalZenerVoltage(String(v));
                    commit({ zenerVoltage: v });
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                    storeZenerVoltage === v
                      ? "bg-sky-600 text-white"
                      : "bg-[#121214] border border-zinc-700 text-zinc-400 hover:border-sky-500/50"
                  }`}
                >
                  {v}V
                </button>
              ))}
            </div>

            <p className="text-[11px] text-zinc-500">
              The reverse voltage the diode clamps to once it breaks down -- this is normal operation, not damage.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Max Power Rating (W)</label>
            <input
              type="number"
              min={0.05}
              step={0.05}
              value={localMaxPowerWatts}
              onChange={(e) => {
                setLocalMaxPowerWatts(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== "" && !isNaN(n) && n > 0) commit({ maxPowerWatts: n });
              }}
              onBlur={() => {
                const n = Number(localMaxPowerWatts);
                if (localMaxPowerWatts === "" || isNaN(n) || n <= 0) {
                  setLocalMaxPowerWatts("0.5");
                  commit({ maxPowerWatts: 0.5 });
                }
              }}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-zinc-500">Exceeded while regulating -- add a series resistor to limit current.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}