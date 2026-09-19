import { useState, useEffect } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function TransistorModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const storeMaxCollectorA = (livePart?.properties?.maxCollectorCurrentAmps as number) ?? 0.5;
  const storeMaxVce = (livePart?.properties?.maxCollectorEmitterVoltage as number) ?? 40;
  const storeSaturationOhms = (livePart?.properties?.saturationOhms as number) ?? 5;

  const [localMaxCollectorA, setLocalMaxCollectorA] = useState(String(storeMaxCollectorA));
  const [localMaxVce, setLocalMaxVce] = useState(String(storeMaxVce));
  const [localSaturationOhms, setLocalSaturationOhms] = useState(String(storeSaturationOhms));

  useEffect(() => {
    setLocalMaxCollectorA(String(storeMaxCollectorA));
    setLocalMaxVce(String(storeMaxVce));
    setLocalSaturationOhms(String(storeSaturationOhms));
  }, [storeMaxCollectorA, storeMaxVce, storeSaturationOhms]);

  if (!livePart) return null;

  const commit = (patch: Record<string, unknown>) => updatePartProperties(livePart.id, patch);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e22] border border-[#333338] rounded-xl p-5 w-80 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold text-sky-400">NPN Transistor Properties</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Max Collector Current (A)</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={localMaxCollectorA}
              onChange={(e) => {
                setLocalMaxCollectorA(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== "" && !isNaN(n) && n > 0) commit({ maxCollectorCurrentAmps: n });
              }}
              onBlur={() => {
                const n = Number(localMaxCollectorA);
                if (localMaxCollectorA === "" || isNaN(n) || n <= 0) {
                  setLocalMaxCollectorA("0.5");
                  commit({ maxCollectorCurrentAmps: 0.5 });
                }
              }}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Max Collector-Emitter Voltage (V)</label>
            <input
              type="number"
              min={1}
              value={localMaxVce}
              onChange={(e) => {
                setLocalMaxVce(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== "" && !isNaN(n) && n > 0) commit({ maxCollectorEmitterVoltage: n });
              }}
              onBlur={() => {
                const n = Number(localMaxVce);
                if (localMaxVce === "" || isNaN(n) || n <= 0) {
                  setLocalMaxVce("40");
                  commit({ maxCollectorEmitterVoltage: 40 });
                }
              }}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-zinc-500">Exceeded while OFF -- e.g. driving too high a supply voltage.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Saturation Resistance (Ω)</label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={localSaturationOhms}
              onChange={(e) => {
                setLocalSaturationOhms(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== "" && !isNaN(n) && n > 0) commit({ saturationOhms: n });
              }}
              onBlur={() => {
                const n = Number(localSaturationOhms);
                if (localSaturationOhms === "" || isNaN(n) || n <= 0) {
                  setLocalSaturationOhms("5");
                  commit({ saturationOhms: 5 });
                }
              }}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-zinc-500">Vce(sat) resistance while ON.</p>
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