import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { Pin } from "./Pin";
import { PinLeg } from "./PinLeg";

interface ToggleSwitchPartProps {
  part: PartInstance;
  selected: boolean;
  onToggle?: (partId: string) => void;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function ToggleSwitchPart({ part, selected, onToggle, pinStates, onPinClick }: ToggleSwitchPartProps) {
  const on = Boolean(part.properties.on);
  const def = partDefinitions["toggle-switch"];

  // Expanded width so the housing completely encloses the pins at x = +/-2
  const bodyHalfW = 2.4 * GRID;
  const bodyTop = -1.8 * GRID;
  const bodyBottom = 1.2 * GRID; 

  const pivotX = 0;
  const pivotY = bodyTop + 4;
  const leverLength = 1.5 * GRID;
  const leverAngle = on ? 35 : -35;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Base Housing */}
      <rect
        x={-bodyHalfW}
        y={bodyTop}
        width={bodyHalfW * 2}
        height={bodyBottom - bodyTop}
        rx={4}
        fill="#3f3f46"
        stroke={selected ? "#4da3ff" : "#18181b"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Pivot Bushing */}
      <circle cx={pivotX} cy={pivotY} r={5} fill="#71717a" stroke="#27272a" strokeWidth={1} />

      {/* Rocker Lever */}
      <g style={{ cursor: onToggle ? "pointer" : "default" }}
        onClick={(e) => { 
          e.stopPropagation();
          onToggle?.(part.id);
        }}>
          
        <circle cx={pivotX} cy={pivotY} r={12} fill="transparent" />
        <line
          x1={pivotX}
          y1={pivotY}
          x2={pivotX}
          y2={pivotY - leverLength}
          stroke={on ? "#22c55e" : "#d4d4d8"}
          strokeWidth={3.5}
          strokeLinecap="round"
          transform={`rotate(${leverAngle} ${pivotX} ${pivotY})`}
        />
        <circle cx={pivotX} cy={pivotY} r={3} fill="#e4e4e7" />
      </g>

      {/* Silkscreen Text */}
      <text x={-10} y={bodyBottom - 4} fontSize={5} fontWeight={700} fill={on ? "#52525b" : "#22c55e"} textAnchor="middle" fontFamily="monospace">
        OFF
      </text>
      <text x={10} y={bodyBottom - 4} fontSize={5} fontWeight={700} fill={on ? "#22c55e" : "#52525b"} textAnchor="middle" fontFamily="monospace">
        ON
      </text>

      {/* Pure PinDots bound strictly to def.pins definition */}
      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyBottom} x2={pin.x * GRID} y2={pin.y * GRID}/>
          <Pin
            x={pin.x * GRID}
            y={pin.y * GRID}
            pinId={pin.id}
            label={pin.label}
            state={pinStates?.[pin.id]}
            onClick={(e) => onPinClick?.(pin.id, e)}
          />
        </g>
      ))}
    </g>
  );
}