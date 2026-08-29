import { useState, useEffect } from "react";
import { useCircuitStore } from "../../../store/circuitStore";
import { DEFAULT_DHT11_HUMIDITY_PERCENT, DEFAULT_DHT11_TEMPERATURE_C } from "../../../config/partDefinitions";
import type { PartInstance } from "../../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function Dht11Modal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const storeTemperatureC = (livePart?.properties?.temperatureC as number) ?? DEFAULT_DHT11_TEMPERATURE_C;
  const [localTemperature, setLocalTemperature] = useState<string>(String(storeTemperatureC));

  const storeHumidity = (livePart?.properties?.humidityPercent as number) ?? DEFAULT_DHT11_HUMIDITY_PERCENT;
  const [localHumidity, setLocalHumidity] = useState<string>(String(storeHumidity));

  useEffect(() => {
    setLocalTemperature(String(storeTemperatureC));
  }, [storeTemperatureC]);

  useEffect(() => {
    setLocalHumidity(String(storeHumidity));
  }, [storeHumidity]);

  if (!livePart) return null;

  const commitTemperature = (raw: string) => {
    const num = Number(raw);
    if (raw !== "" && !isNaN(num)) {
      updatePartProperties(livePart.id, { temperatureC: Math.min(80, Math.max(-40, num)) });
    }
  };

  const handleTemperatureSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTemperature(e.target.value);
    commitTemperature(e.target.value);
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalTemperature(val);
    const num = Number(val);
    if (val !== "" && !isNaN(num) && num >= -40 && num <= 80) {
      updatePartProperties(livePart.id, { temperatureC: num });
    }
  };

  const handleTemperatureBlur = () => {
    const num = Number(localTemperature);
    const clamped =
      localTemperature === "" || isNaN(num)
        ? DEFAULT_DHT11_TEMPERATURE_C
        : Math.min(80, Math.max(-40, num));
    setLocalTemperature(String(clamped));
    updatePartProperties(livePart.id, { temperatureC: clamped });
  };

  const commitHumidity = (raw: string) => {
    const num = Number(raw);
    if (raw !== "" && !isNaN(num)) {
      updatePartProperties(livePart.id, { humidityPercent: Math.min(100, Math.max(0, num)) });
    }
  };

  const handleHumiditySlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalHumidity(e.target.value);
    commitHumidity(e.target.value);
  };

  const handleHumidityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalHumidity(val);
    const num = Number(val);
    if (val !== "" && !isNaN(num) && num >= 0 && num <= 100) {
      updatePartProperties(livePart.id, { humidityPercent: num });
    }
  };

  const handleHumidityBlur = () => {
    const num = Number(localHumidity);
    const clamped =
      localHumidity === "" || isNaN(num)
        ? DEFAULT_DHT11_HUMIDITY_PERCENT
        : Math.min(100, Math.max(0, num));
    setLocalHumidity(String(clamped));
    updatePartProperties(livePart.id, { humidityPercent: clamped });
  };

  const handleDone = () => {
    handleTemperatureBlur();
    handleHumidityBlur();
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

        <div className="space-y-5">
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-zinc-400">Temperature</label>
              <span className="text-xs text-sky-400 font-mono">{localTemperature} °C</span>
            </div>
            <input
              type="range"
              min={-40}
              max={80}
              step={0.1}
              value={localTemperature}
              onChange={handleTemperatureSlider}
              className="w-full accent-sky-500"
            />
            <div className="relative">
              <input
                type="number"
                min={-40}
                max={80}
                step={0.1}
                value={localTemperature}
                onChange={handleTemperatureChange}
                onBlur={handleTemperatureBlur}
                className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500 pr-10"
                placeholder="e.g. 25.0"
              />
              <span className="absolute right-3 top-2 text-xs text-zinc-500 pointer-events-none font-semibold">°C</span>
            </div>
          </div>

          {/* Humidity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-zinc-400">Humidity</label>
              <span className="text-xs text-sky-400 font-mono">{localHumidity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={localHumidity}
              onChange={handleHumiditySlider}
              className="w-full accent-sky-500"
            />
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={localHumidity}
                onChange={handleHumidityChange}
                onBlur={handleHumidityBlur}
                className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500 pr-10"
                placeholder="e.g. 50.0"
              />
              <span className="absolute right-3 top-2 text-xs text-zinc-500 pointer-events-none font-semibold">%</span>
            </div>
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