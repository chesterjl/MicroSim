import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";
import { BatteryModal } from "../parts/battery/BatteryModal";
import { LedModal } from "../parts/led/LedModal";
import { PotentiometerModal } from "../parts/potentiometer/PotentiometerModal";
import { PhotoresistorModal } from "../parts/resistor/PhotoresistorModal";
import { ResistorModal } from "../parts/resistor/ResistorModal";
import { UltrasonicHcsr04Modal } from "../parts/sensor/UltrasonicHcsr04Modal";

interface Props {
  part: PartInstance | null;
  onClose: () => void;
}

export function ComponentPropertiesModal({ part, onClose }: Props) {
  const livePart = useCircuitStore((s) => s.parts.find((p) => p.id === part?.id));

  if (!livePart) return null;

  switch (livePart.type) {
    case "led":
      return <LedModal part={part} onClose={onClose} />;
    case "resistor":
      return <ResistorModal part={part} onClose={onClose} />;
    case "battery":
      return <BatteryModal part={part} onClose={onClose} />;
    case "potentiometer":
      return <PotentiometerModal part={part} onClose={onClose} />;
    case "ultrasonic-hcsr04":
      return <UltrasonicHcsr04Modal part={part} onClose={onClose} />;
    case "photoresistor":
      return <PhotoresistorModal part={part} onClose={onClose} />;
    default:
      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1e1e22] border border-[#333338] rounded-xl p-5 w-80 shadow-2xl text-zinc-200">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-semibold capitalize text-sky-400">{livePart.type} Properties</h3>
              <button onClick={onClose} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-500 italic">No adjustable properties for this component.</p>
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
}