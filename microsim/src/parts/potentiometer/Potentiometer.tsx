import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";

interface PotentiometerPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function PotentiometerPart({ part, selected, pinStates, onPinClick }: PotentiometerPartProps) {
  const def = partDefinitions.potentiometer;
  const maxResistance = (part.properties?.maxResistance as number) ?? 10000;
  // 0 = fully counter-clockwise (all resistance on pin2's side), 1 = fully
  // clockwise (all resistance on pin1's side).
  const wiperPosition = (part.properties?.wiperPosition as number) ?? 0.5;

  // Real trimmer pots sweep about 270° of rotation, starting at -135°.
  const angle = -135 + wiperPosition * 270;

  const bodyHalfW = 3 * GRID;
  const bodyTop = -3 * GRID;
  const bodyBottom = 2 * GRID;
  const knobCx = 0;
  const knobCy = -0.5 * GRID;
  const knobR = 2.2 * GRID;

  const formatOhms = (ohms: number) => (ohms >= 1000 ? `${+(ohms / 1000).toFixed(1)}k` : `${ohms}`);

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Body */}
      <rect
        x={-bodyHalfW}
        y={bodyTop}
        width={bodyHalfW * 2}
        height={bodyBottom - bodyTop}
        rx={4}
        fill="#e4e4e7"
        stroke={selected ? "#4da3ff" : "#a1a1aa"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Rotating knob */}
      <circle cx={knobCx} cy={knobCy} r={knobR} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.5} />
      <circle cx={knobCx} cy={knobCy} r={knobR * 0.55} fill="#3b82f6" opacity={0.6} />

      {/* Wiper indicator — rotates to reflect the current wiperPosition */}
      <line
        x1={knobCx}
        y1={knobCy}
        x2={knobCx}
        y2={knobCy - knobR * 0.85}
        stroke="#dbeafe"
        strokeWidth={3}
        strokeLinecap="round"
        transform={`rotate(${angle} ${knobCx} ${knobCy})`}
      />

      {/* Rated max resistance, printed above the body */}
      <text x={0} y={bodyTop - 6} textAnchor="middle" fontSize={9} fontWeight={700} fill="#a1a1aa" fontFamily="monospace">
        {formatOhms(maxResistance)}Ω
      </text>

      {/* Dynamic Pin Lead Lines & Interactive Nodes */}
      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={ pin.x * GRID} y1={bodyBottom} x2={pin.x * GRID} y2={pin.y * GRID}/>
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