import { useState, useEffect } from "react";
import { useCircuitStore } from "../../state/circuitStore";
import type { PartInstance } from "../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function ComponentPropertiesModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);

  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const storeResistance = (livePart?.properties?.resistance as number) ?? 220;
  const [localResistance, setLocalResistance] = useState<string>(String(storeResistance));

  const storeVoltage = (livePart?.properties?.voltage as number) ?? 9;
  const [localVoltage, setLocalVoltage] = useState<string>(String(storeVoltage));

  const storeMaxResistance = (livePart?.properties?.maxResistance as number) ?? 10000;
  const [localMaxResistance, setLocalMaxResistance] = useState<string>(String(storeMaxResistance));

  const storeWiperPosition = (livePart?.properties?.wiperPosition as number) ?? 0.5;
  const [localWiperPercent, setLocalWiperPercent] = useState<string>(String(Math.round(storeWiperPosition * 100)));

  const storeDistanceCm = (livePart?.properties?.distanceCm as number) ?? 50;
  const [localDistanceCm, setLocalDistanceCm] = useState<string>(String(storeDistanceCm));

  useEffect(() => {
    setLocalResistance(String(storeResistance));
  }, [storeResistance]);

  useEffect(() => {
    setLocalVoltage(String(storeVoltage));
  }, [storeVoltage]);

  useEffect(() => {
    setLocalMaxResistance(String(storeMaxResistance));
  }, [storeMaxResistance]);

  useEffect(() => {
    setLocalWiperPercent(String(Math.round(storeWiperPosition * 100)));
  }, [storeWiperPosition]);

  useEffect(() => {
    setLocalDistanceCm(String(storeDistanceCm));
  }, [storeDistanceCm]);

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

  // HC-SR04: distance (0-400cm, matches the real sensor's spec'd range)
  // and a detection threshold -- object counts as "detected" (ECHO reads
  // HIGH once powered) whenever distance <= threshold. Sliders commit
  // immediately; the number inputs allow precise typing alongside them.
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
    const clamped = localDistanceCm === "" || isNaN(num) ? 50 : Math.min(400, Math.max(0, num));
    setLocalDistanceCm(String(clamped));
    updatePartProperties(livePart.id, { distanceCm: clamped });
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

        {livePart.type === "led" && (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-400">LED Color</label>
            <select
              value={(livePart.properties?.color as string) || "red"}
              onChange={(e) => updatePartProperties(livePart.id, { color: e.target.value })}
              className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"
            >
              <option value="red">🔴 Red</option>
              <option value="green">🟢 Green</option>
              <option value="blue">🔵 Blue</option>
              <option value="yellow">🟡 Yellow</option>
            </select>
          </div>
        )}

        {livePart.type === "resistor" && (
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
        )}

        {livePart.type === "battery" && (
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
        )}

        {livePart.type === "potentiometer" && (
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
        )}

        {livePart.type === "ultrasonic-hcsr04" && (
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
        )}

        {livePart.type !== "led" &&
          livePart.type !== "resistor" &&
          livePart.type !== "battery" &&
          livePart.type !== "potentiometer" &&
          livePart.type !== "ultrasonic-hcsr04" && (
            <p className="text-xs text-zinc-500 italic">No adjustable properties for this component.</p>
          )}

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