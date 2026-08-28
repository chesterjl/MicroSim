import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";

export function IrReceiverPart({
  part,
  selected,
  pinStates,
  onPinClick,
}: {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}) {
  const def = partDefinitions["ir-receiver"];

  const bodyHalfW = 2.2 * GRID;
  const bodyTop = -2.6 * GRID;
  const bodyBottom = 1 * GRID;
  const legTipY = 3 * GRID;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {def.pins.map((pin) => (
        <line
          key={`leg-${pin.id}`}
          x1={pin.x * GRID}
          y1={bodyBottom}
          x2={pin.x * GRID}
          y2={legTipY}
          stroke="#c7c7c7"
          strokeWidth={2}
        />
      ))}

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

      <path d={`M ${bodyHalfW - 10} ${bodyTop + 2} q 4 -3 8 0`} fill="none" stroke="#52525b" strokeWidth={1} />

      {def.pins.map((pin) => (
        <text
          key={`label-${pin.id}`}
          x={pin.x * GRID}
          y={bodyBottom + 12}
          textAnchor="middle"
          fontSize={5}
          fontWeight={700}
          fill="#a1a1aa"
          fontFamily="monospace"
          transform={`rotate(90 ${pin.x * GRID} ${bodyBottom + 12})`}
        >
          {pin.label}
        </text>
      ))}

      {def.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={legTipY}
          pinId={pin.id}
          label={pin.label}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}