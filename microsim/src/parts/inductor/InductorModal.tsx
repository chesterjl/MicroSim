import { useState, useEffect } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

const INDUCTANCE_UNITS = ["H", "mH", "µH"] as const;

export function InductorModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const storeValue = (livePart?.properties?.inductanceValue as number) ?? 100;
  const storeUnit = (livePart?.properties?.inductanceUnit as string) ?? "µH";
  const storeRatedCurrent = (livePart?.properties?.ratedCurrentAmps as number) ?? 1;
  const storeDcResistance = (livePart?.properties?.dcResistanceOhms as number) ?? 2;

  const [localValue, setLocalValue] = useState(String(storeValue));
  const [localUnit, setLocalUnit] = useState(storeUnit);
  const [localRatedCurrent, setLocalRatedCurrent] = useState(String(storeRatedCurrent));
  const [localDcResistance, setLocalDcResistance] = useState(String(storeDcResistance));

  useEffect(() => {
    setLocalValue(String(storeValue));
    setLocalUnit(storeUnit);
    setLocalRatedCurrent(String(storeRatedCurrent));
    setLocalDcResistance(String(storeDcResistance));
  }, [storeValue, storeUnit, storeRatedCurrent, storeDcResistance]);

  if (!livePart) return null;

  const commit = (patch: Record<string, unknown>) => updatePartProperties(livePart.id, patch);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e22] border border-[#333338] rounded-xl p-5 w-80 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold text-sky-400">Inductor Properties</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Inductance</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0.001}
                value={localValue}
                onChange={(e) => {
                  setLocalValue(e.target.value);
                  const n = Number(e.target.value);
                  if (e.target.value !== "" && !isNaN(n) && n > 0) commit({ inductanceValue: n });
                }}
                onBlur={() => {
                  const n = Number(localValue);
                  if (localValue === "" || isNaN(n) || n <= 0) {
                    setLocalValue("100");
                    commit({ inductanceValue: 100 });
                  }
                }}
                className="flex-1 bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
              />
              <select
                value={localUnit}
                onChange={(e) => {
                  setLocalUnit(e.target.value);
                  commit({ inductanceUnit: e.target.value });
                }}
                className="bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
              >
                {INDUCTANCE_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Rated Current (A)</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={localRatedCurrent}
              onChange={(e) => {
                setLocalRatedCurrent(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== "" && !isNaN(n) && n > 0) commit({ ratedCurrentAmps: n });
              }}
              onBlur={() => {
                const n = Number(localRatedCurrent);
                if (localRatedCurrent === "" || isNaN(n) || n <= 0) {
                  setLocalRatedCurrent("1");
                  commit({ ratedCurrentAmps: 1 });
                }
              }}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-zinc-500">Beyond this, the coil overheats and burns out.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Winding (DC) Resistance (Ω)</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={localDcResistance}
              onChange={(e) => {
                setLocalDcResistance(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== "" && !isNaN(n) && n > 0) commit({ dcResistanceOhms: n });
              }}
              onBlur={() => {
                const n = Number(localDcResistance);
                if (localDcResistance === "" || isNaN(n) || n <= 0) {
                  setLocalDcResistance("2");
                  commit({ dcResistanceOhms: 2 });
                }
              }}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
            />
          </div>

          <p className="text-[11px] text-zinc-500">
            Real current: {((livePart.properties?.storedCurrent as number) ?? 0).toFixed(3)}A
          </p>
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