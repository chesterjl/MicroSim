import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState, Netlist } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { Pin } from "./Pin";
import { PinLeg } from "./PinLeg";

interface PassiveBuzzerPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function PassiveBuzzerPart({part, selected, pinStates, onPinClick}: PassiveBuzzerPartProps) {
  const def = partDefinitions["passive-buzzer"];

  const bodyRadius = 4 * GRID;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>

      {/* Passive buzzer body */}
      <circle
        cx={0}
        cy={0}
        r={bodyRadius}
        fill="#18181B"
        stroke={selected ? "#4da3ff" : "#09090B"}
        strokeWidth={selected ? 2 : 1.5}
      />

      <circle
        cx={0}
        cy={0}
        r={3.25 * GRID}
        fill="#202024"
        stroke="#3F3F46"
        strokeWidth={1}
      />

      {/* Speaker */}
      <circle
        cx={0}
        cy={0}
        r={2.15 * GRID}
        fill="#09090B"
        stroke="#52525B"
        strokeWidth={1}
      />

      <circle
        cx={0}
        cy={0}
        r={1.35 * GRID}
        fill="#18181B"
      />

      <circle
        cx={0}
        cy={0}
        r={0.55 * GRID}
        fill="#09090B"
      />

      {/* Speaker ring */}
      <path
        d={`
          M ${-1.7 * GRID} ${-0.9 * GRID}
          A ${1.9 * GRID} ${1.9 * GRID} 0 0 1
          ${1.7 * GRID} ${-0.9 * GRID}
        `}
        fill="none"
        stroke="#52525B"
        strokeWidth={0.7}
      />

      <path
        d={`
          M ${-1.7 * GRID} ${0.9 * GRID}
          A ${1.9 * GRID} ${1.9 * GRID} 0 0 0
          ${1.7 * GRID} ${0.9 * GRID}
        `}
        fill="none"
        stroke="#52525B"
        strokeWidth={0.7}
      />

      {/* Passive/frequency symbol */}
      <text
        x={0}
        y={-2.45 * GRID}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#A1A1AA"
        fontSize={1.2 * GRID}
        fontWeight="bold"
        pointerEvents="none"
      >
        ~
      </text>

      {/* Polarity markings - aligned */}
      <text
        x={-2.7 * GRID}
        y={2.5 * GRID}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#EF4444"
        fontSize={1.5 * GRID}
        fontWeight="bold"
        pointerEvents="none"
      >
        +
      </text>

      <text
        x={2.7 * GRID}
        y={2.5 * GRID}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#A1A1AA"
        fontSize={1.5 * GRID}
        fontWeight="bold"
        pointerEvents="none"
      >
        −
      </text>

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyRadius} x2={pin.x * GRID} y2={5 * GRID}/>
          <Pin
            x={pin.x * GRID}
            y={5 * GRID}
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