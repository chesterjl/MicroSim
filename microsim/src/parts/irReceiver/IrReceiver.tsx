import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLabel } from "../../components/parts/pin/PinLabel";
import { PinLeg } from "../../components/parts/pin/PinLeg";

interface IrReceiverPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function IrReceiverPart({part, selected, pinStates, onPinClick}: IrReceiverPartProps) {
  const def = partDefinitions["ir-receiver"];

  const bodyHalfW = 2.2 * GRID;
  const bodyTop = -2.6 * GRID;
  const bodyBottom = 1 * GRID;
  const legTipY = 3 * GRID;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>

      <rect
        x={-bodyHalfW}
        y={bodyTop}
        width={bodyHalfW * 2}
        height={bodyBottom - bodyTop}
        rx={4}
        fill="#141414"
        stroke={selected ? "#4da3ff" : "#000000"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Dome-shaped IR sensor window */}
      <path
        d={`M ${-bodyHalfW + 6} ${bodyTop + 10}
            Q 0 ${bodyTop - 6} ${bodyHalfW - 6} ${bodyTop + 10}
            L ${bodyHalfW - 6} ${bodyTop + 18}
            L ${-bodyHalfW + 6} ${bodyTop + 18}
            Z`}
        fill="#1c1c1c"
        stroke="#3a3a3a"
        strokeWidth={1}
      />

      {def.pins.map((pin) => (
        <g>
          <PinLabel x={pin.x * GRID} y={bodyBottom - 4} text={pin.label} color="#a1a1aa" fontSize={5}/>
          <PinLeg x1={pin.x * GRID} y1={bodyBottom} x2={pin.x * GRID} y2={legTipY} />
          <Pin
            x={pin.x * GRID}
            y={legTipY}
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