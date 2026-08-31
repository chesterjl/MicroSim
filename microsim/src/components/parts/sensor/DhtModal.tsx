import { useState, useEffect } from "react";
import { useCircuitStore } from "../../../store/circuitStore";
import {
  DHT11_HUMIDITY_RANGE,
  DHT11_TEMPERATURE_RANGE,
  DHT11_TEMPERATURE_ACCURACY_C,
  DHT11_HUMIDITY_ACCURACY_PERCENT,
  DHT22_HUMIDITY_RANGE,
  DHT22_TEMPERATURE_RANGE,
  DHT22_TEMPERATURE_ACCURACY_C,
  DHT22_HUMIDITY_ACCURACY_PERCENT,
  DEFAULT_DHT11_HUMIDITY_PERCENT,
  DEFAULT_DHT11_TEMPERATURE_C,
  DEFAULT_DHT22_HUMIDITY_PERCENT,
  DEFAULT_DHT22_TEMPERATURE_C,
} from "../../../config/partDefinitions";
import type { PartInstance } from "../../../types/types";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

// Per-model datasheet limits. DHT11 can't read freezing temps or extreme
// humidity the way DHT22 can -- clamping and defaults both key off this,
// so picking the wrong sensor type in the store automatically gets the
// right physical limits here rather than needing a second source of truth.
const DHT_SPECS = {
  dht11: {
    label: "DHT11",
    temperature: DHT11_TEMPERATURE_RANGE,
    humidity: DHT11_HUMIDITY_RANGE,
    temperatureAccuracyC: DHT11_TEMPERATURE_ACCURACY_C,
    humidityAccuracyPercent: DHT11_HUMIDITY_ACCURACY_PERCENT,
    defaultTemperatureC: DEFAULT_DHT11_TEMPERATURE_C,
    defaultHumidityPercent: DEFAULT_DHT11_HUMIDITY_PERCENT,
  },
  dht22: {
    label: "DHT22",
    temperature: DHT22_TEMPERATURE_RANGE,
    humidity: DHT22_HUMIDITY_RANGE,
    temperatureAccuracyC: DHT22_TEMPERATURE_ACCURACY_C,
    humidityAccuracyPercent: DHT22_HUMIDITY_ACCURACY_PERCENT,
    defaultTemperatureC: DEFAULT_DHT22_TEMPERATURE_C,
    defaultHumidityPercent: DEFAULT_DHT22_HUMIDITY_PERCENT,
  },
} as const;

function getSpec(type: string | undefined) {
  return DHT_SPECS[type as keyof typeof DHT_SPECS] ?? DHT_SPECS.dht11;
}

export function DhtModal({ part, onClose }: Props) {
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  const spec = getSpec(livePart?.type);

  const storeTemperatureC = (livePart?.properties?.temperatureC as number) ?? spec.defaultTemperatureC;
  const [localTemperature, setLocalTemperature] = useState<string>(String(storeTemperatureC));

  const storeHumidity = (livePart?.properties?.humidityPercent as number) ?? spec.defaultHumidityPercent;
  const [localHumidity, setLocalHumidity] = useState<string>(String(storeHumidity));

  useEffect(() => {
    setLocalTemperature(String(storeTemperatureC));
  }, [storeTemperatureC]);

  useEffect(() => {
    setLocalHumidity(String(storeHumidity));
  }, [storeHumidity]);

  if (!livePart) return null;

  const { min: minTemp, max: maxTemp } = spec.temperature;
  const { min: minHumidity, max: maxHumidity } = spec.humidity;

  const commitTemperature = (raw: string) => {
    const num = Number(raw);
    if (raw !== "" && !isNaN(num)) {
      updatePartProperties(livePart.id, { temperatureC: Math.min(maxTemp, Math.max(minTemp, num)) });
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
    if (val !== "" && !isNaN(num) && num >= minTemp && num <= maxTemp) {
      updatePartProperties(livePart.id, { temperatureC: num });
    }
  };

  const handleTemperatureBlur = () => {
    const num = Number(localTemperature);
    const clamped =
      localTemperature === "" || isNaN(num)
        ? spec.defaultTemperatureC
        : Math.min(maxTemp, Math.max(minTemp, num));
    setLocalTemperature(String(clamped));
    updatePartProperties(livePart.id, { temperatureC: clamped });
  };

  const commitHumidity = (raw: string) => {
    const num = Number(raw);
    if (raw !== "" && !isNaN(num)) {
      updatePartProperties(livePart.id, { humidityPercent: Math.min(maxHumidity, Math.max(minHumidity, num)) });
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
    if (val !== "" && !isNaN(num) && num >= minHumidity && num <= maxHumidity) {
      updatePartProperties(livePart.id, { humidityPercent: num });
    }
  };

  const handleHumidityBlur = () => {
    const num = Number(localHumidity);
    const clamped =
      localHumidity === "" || isNaN(num)
        ? spec.defaultHumidityPercent
        : Math.min(maxHumidity, Math.max(minHumidity, num));
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
          <h3 className="text-sm font-semibold text-sky-400">{spec.label} Properties</h3>
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
              min={minTemp}
              max={maxTemp}
              step={0.1}
              value={localTemperature}
              onChange={handleTemperatureSlider}
              className="w-full accent-sky-500"
            />
            <div className="relative">
              <input
                type="number"
                min={minTemp}
                max={maxTemp}
                step={0.1}
                value={localTemperature}
                onChange={handleTemperatureChange}
                onBlur={handleTemperatureBlur}
                className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500 pr-10"
                placeholder={`e.g. ${spec.defaultTemperatureC.toFixed(1)}`}
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
              min={minHumidity}
              max={maxHumidity}
              step={0.1}
              value={localHumidity}
              onChange={handleHumiditySlider}
              className="w-full accent-sky-500"
            />
            <div className="relative">
              <input
                type="number"
                min={minHumidity}
                max={maxHumidity}
                step={0.1}
                value={localHumidity}
                onChange={handleHumidityChange}
                onBlur={handleHumidityBlur}
                className="w-full bg-[#121214] border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500 pr-10"
                placeholder={`e.g. ${spec.defaultHumidityPercent.toFixed(1)}`}
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