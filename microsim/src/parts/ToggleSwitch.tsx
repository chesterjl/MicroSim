import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";

interface ToggleSwitchPartProps {
  part: PartInstance;
  selected: boolean;
  onToggle?: (partId: string) => void;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function ToggleSwitchPart({part, selected, onToggle, pinStates, onPinClick}: ToggleSwitchPartProps) {
  const on = Boolean(part.properties.on);
  const def = partDefinitions["toggle-switch"];

  const bodyHalfW = 1.8 * GRID;
  const bodyTop = -1.8 * GRID;

  const bodyBottom = 1.6 * GRID - 3;
  const pinY = 2 * GRID - 3;

  // Lever pivots at the top-center of the body.
  const pivotX = 0;
  const pivotY = bodyTop + 4;
  const leverLength = 1.5 * GRID;
  const leverAngle = on ? 35 : -35;
    
  return (
    <g
      transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}
    >
      {/* Legs down to the pin tips */}
      <line
        x1={-1.5 * GRID}
        y1={bodyBottom}
        x2={-1.5 * GRID}
        y2={pinY}
        stroke="#9ca3af"
        strokeWidth={2}
      />

      <line
        x1={1.5 * GRID}
        y1={bodyBottom}
        x2={1.5 * GRID}
        y2={pinY}
        stroke="#9ca3af"
        strokeWidth={2}
      />

      {/* Base housing */}
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

      {/* Threaded bushing the lever sticks out of */}
      <circle
        cx={pivotX}
        cy={pivotY}
        r={5}
        fill="#71717a"
        stroke="#27272a"
        strokeWidth={1}
      />

      {/* Rocker lever */}
      <g
        style={{ cursor: onToggle ? "pointer" : "default" }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.(part.id);
        }}
      >
        {/* Wide invisible hit area */}
        <circle
          cx={pivotX}
          cy={pivotY}
          r={12}
          fill="transparent"
        />

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

        <circle
          cx={pivotX}
          cy={pivotY}
          r={3}
          fill="#e4e4e7"
        />
      </g>

      {/* ON / OFF silkscreen */}
      <text
        x={-9}
        y={bodyBottom - 3}
        fontSize={5}
        fontWeight={700}
        fill={on ? "#52525b" : "#22c55e"}
        textAnchor="middle"
        fontFamily="monospace"
      >
        OFF
      </text>

      <text
        x={9}
        y={bodyBottom - 3}
        fontSize={5}
        fontWeight={700}
        fill={on ? "#22c55e" : "#52525b"}
        textAnchor="middle"
        fontFamily="monospace"
      >
        ON
      </text>

      {/* Pins */}
      {def.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={pinY}
          pinId={pin.id}
          label={`${pin.label} (${on ? "closed" : "open"})`}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}
