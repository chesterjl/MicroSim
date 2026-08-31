import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { Pin } from "./Pin";
import { PinLeg } from "./PinLeg";

interface CapacitorNonPolarizedPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function CapacitorNonPolarizedPart({ part, selected, pinStates, onPinClick }: CapacitorNonPolarizedPartProps) {
  const def = partDefinitions["capacitor-nonpolarized"];
  const capacitanceValue = (part.properties?.capacitanceValue as number) ?? 100;
  const capacitanceUnit = (part.properties?.capacitanceUnit as string) ?? "nF";
  const storedVoltage = (part.properties?.storedVoltage as number) ?? 0;

  const bodyTop = -2 * GRID;
  const bodyBottom = 1.5 * GRID;
  const cy = (bodyTop + bodyBottom) / 2;
  const ry = (bodyBottom - bodyTop) / 2;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Ceramic disc body */}
      <ellipse cx={0} cy={cy} rx={2 * GRID} ry={ry} fill="#f4c542" stroke={selected ? "#4da3ff" : "#8a6d1a"} strokeWidth={selected ? 2.5 : 1.5}/>
    
      {/* Charge-level indicator */}
      {storedVoltage > 0.05 && (
        <ellipse
          cx={0}
          cy={cy}
          rx={2 * GRID - 3}
          ry={ry - 3}
          fill="none"
          stroke="#22c55e"
          strokeWidth={1.5}
          opacity={Math.min(1, storedVoltage / 5)}
        />
      )}

      {/* Silkscreen Value */}
      <text x={0} y={cy + 3} textAnchor="middle" fontSize={7} fontWeight={700} fill="#4b3b0a">
        {capacitanceValue}{capacitanceUnit}
      </text>

      {/* Legs + Pins, one loop over def.pins instead of two */}
      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={cy} x2={pin.x * GRID} y2={pin.y * GRID} />
          <Pin
            x={pin.x * GRID}
            y={pin.y * GRID}
            pinId={pin.id}
            label={`${pin.label} — ${storedVoltage.toFixed(2)}V stored`}
            state={pinStates?.[pin.id]}
            onClick={(e) => onPinClick?.(pin.id, e)}
          />
        </g>
      ))}
    </g>
  );
}