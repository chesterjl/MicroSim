import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { Pin } from "./Pin";
import { PinLeg } from "./PinLeg";

interface CapacitorPolarizedPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function CapacitorPolarizedPart({ part, selected, pinStates, onPinClick }: CapacitorPolarizedPartProps ) {
  const def = partDefinitions["capacitor-polarized"];

  const voltageRating = (part.properties?.voltageRating as number) ?? 16;
  const storedVoltage = (part.properties?.storedVoltage as number) ?? 0;

  const chargeRatio =
    voltageRating > 0 ? Math.max(0, Math.min(1, storedVoltage / voltageRating)) : 0;

  const bodyHalfW = 2 * GRID;
  const bodyTop = -3.5 * GRID;
  const bodyBottom = 1.5 * GRID;
  const fillTrackH = bodyBottom - bodyTop - 6;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Electrolytic can body */}
      <rect
        x={-bodyHalfW}
        y={bodyTop}
        width={bodyHalfW * 2}
        height={bodyBottom - bodyTop}
        rx={6}
        fill="#2b2b2e"
        stroke={selected ? "#4da3ff" : "#111"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Negative-side stripe */}
      <rect
        x={0.4 * GRID}
        y={bodyTop + 2}
        width={bodyHalfW - 0.4 * GRID - 2}
        height={bodyBottom - bodyTop - 4}
        fill="#171717"
      />
      {[0, 1, 2].map((i) => (
        <text
          key={i}
          x={0.4 * GRID + (bodyHalfW - 0.4 * GRID - 2) / 2}
          y={bodyTop + 10 + i * 8}
          textAnchor="middle"
          fontSize={7}
          fontWeight={700}
          fill="#e5e5e5"
        >
          −
        </text>
      ))}

      {/* Charge-level fill */}
      {chargeRatio > 0 && (
        <rect
          x={-bodyHalfW + 3}
          y={bodyBottom - 3 - fillTrackH * chargeRatio}
          width={bodyHalfW - 0.4 * GRID - 5}
          height={fillTrackH * chargeRatio}
          fill="#22c55e"
          opacity={0.55}
        />
      )}
    
      <path
        d={`M 0 ${bodyTop + 2} L 0 ${bodyTop + 8} M -5 ${bodyTop + 5} L 5 ${bodyTop + 5}`}
        stroke="#4b5563"
        strokeWidth={1}
      />  
      
      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyBottom} x2={pin.x * GRID} y2={pin.y * GRID} />
          <Pin
            key={pin.id}
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