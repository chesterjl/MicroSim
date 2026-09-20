import { useState, useEffect } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function CurrentSourceModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const storeCurrentMa = ((livePart?.properties?.currentAmps as number) ?? 0.02) * 1000;
  const storeMaxCompliance = (livePart?.properties?.maxComplianceVoltage as number) ?? 30;

  const [localCurrentMa, setLocalCurrentMa] = useState(String(storeCurrentMa));
  const [localMaxCompliance, setLocalMaxCompliance] = useState(String(storeMaxCompliance));

  useEffect(() => {
    setLocalCurrentMa(String(storeCurrentMa));
    setLocalMaxCompliance(String(storeMaxCompliance));
  }, [storeCurrentMa, storeMaxCompliance]);

  if (!livePart) return null;

  const commit = (patch: Record<string, unknown>) => updatePartProperties(livePart.id, patch);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e22] border border-[#333338] rounded-xl p-5 w-80 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold text-sky-400">DC Current Source Properties</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Source Current (mA)</label>
            <input
              type="number"
              min={0.01}
              step={0.1}
              value={localCurrentMa}
              onChange={(e) => {
                setLocalCurrentMa(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== "" && !isNaN(n) && n > 0) commit({ currentAmps: n / 1000 });
              }}
              onBlur={() => {
                const n = Number(localCurrentMa);
                if (localCurrentMa === "" || isNaN(n) || n <= 0) {
                  setLocalCurrentMa("20");
                  commit({ currentAmps: 0.02 });
                }
              }}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
              placeholder="e.g. 20"
            />
            <p className="text-[11px] text-zinc-500">
              Forces exactly this much current through whatever's connected -- the load's resistance decides the voltage, not the other way around.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">Max Compliance Voltage (V)</label>
            <input
              type="number"
              min={1}
              step={1}
              value={localMaxCompliance}
              onChange={(e) => {
                setLocalMaxCompliance(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== "" && !isNaN(n) && n > 0) commit({ maxComplianceVoltage: n });
              }}
              onBlur={() => {
                const n = Number(localMaxCompliance);
                if (localMaxCompliance === "" || isNaN(n) || n <= 0) {
                  setLocalMaxCompliance("30");
                  commit({ maxComplianceVoltage: 30 });
                }
              }}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-zinc-500">
              The highest voltage this source can develop to push its set current through a high-resistance load. Beyond this, it can't keep up.
            </p>
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