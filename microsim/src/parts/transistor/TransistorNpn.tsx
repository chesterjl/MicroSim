import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { PinLabel } from "../../components/parts/pin/PinLabel";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

interface TransistorNpnPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

const BLUE_SELECTED = "#60a5fa";

const CHARRED_BODY = "#1a1108";
const CHARRED_STROKE = "#7f1d1d";

export function TransistorNpnPart({
  part,
  selected,
  pinStates,
  netlist,
  onPinClick,
}: TransistorNpnPartProps) {
  const def = partDefinitions["transistor-npn"];

  const isOn = netlist?.hasFlag("transistorOn", part.id) ?? false;
  const overloaded = netlist?.hasFlag("transistorOverloaded", part.id) ?? false;

  const bodyHalfW = 1.9 * GRID;
  const bodyTop = -3 * GRID;
  const bodyBottom = 1 * GRID;

  const domeRadius = bodyHalfW;
  const domeCenterY = bodyTop + domeRadius;
  const clipId = `transistor-cap-clip-${part.id}`;

  const outlineColor = overloaded
    ? "#27272a"
    : selected
      ? BLUE_SELECTED
      : "#27272a";

  const strokeWidth = selected ? 3.5 : 1.5;

  const bodyFill = overloaded ? CHARRED_BODY : "#3f3f46";
  const capFill = overloaded ? CHARRED_STROKE : "#52525b";

  // Seamless single outer body path (flat bottom, straight sides, semi-circular top)
  const bodyPathD = `
    M ${-bodyHalfW} ${bodyBottom}
    L ${-bodyHalfW} ${domeCenterY}
    A ${domeRadius} ${domeRadius} 0 0 1 ${bodyHalfW} ${domeCenterY}
    L ${bodyHalfW} ${bodyBottom}
    Z
  `;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>
        {overloaded
          ? "NPN Transistor -- BURNED OUT (overcurrent or overvoltage)"
          : `NPN Transistor -- ${isOn ? "ON (conducting)" : "OFF"}`}
      </title>

      <defs>
        {/* Clip path matching exact outer body contour */}
        <clipPath id={clipId}>
          <path d={bodyPathD} />
        </clipPath>
      </defs>

      {/* Main transistor body */}
      <path
        d={bodyPathD}
        fill={bodyFill}
        stroke={outlineColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      {/* Two-tone dome highlight (clipped to body path) */}
      <rect
        x={-bodyHalfW - 5}
        y={bodyTop - 5}
        width={bodyHalfW * 2 + 10}
        height={domeRadius + 3}
        fill={capFill}
        clipPath={`url(#${clipId})`}
      />

      {/* NPN badge */}
      <text
        x={0}
        y={-1 * GRID}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={15}
        fontWeight={800}
        fill="#f4f4f5"
        fontFamily="system-ui, sans-serif"
      >
        N
      </text>

      {/* Conduction indicator */}
      {isOn && !overloaded && (
        <circle
          cx={0}
          cy={domeTopGlowY(bodyTop)}
          r={3}
          fill="#22c55e"
          opacity={0.9}
        />
      )}

      {overloaded && (
        <OvercurrentBurst cx={0} cy={-0.5 * GRID} size={bodyHalfW * 1.5} />
      )}

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyBottom} x2={pin.x * GRID} y2={pin.y * GRID} />
          <PinLabel x={pin.x * GRID} y={pin.y * GRID - 15} text={pin.label}/>
          <Pin x={pin.x * GRID} y={pin.y * GRID} pinId={pin.id} label={pin.label} state={pinStates?.[pin.id]} onClick={(e) => onPinClick?.(pin.id, e)}
          />
        </g>
      ))}
    </g>
  );
}

function domeTopGlowY(bodyTop: number) {
  return bodyTop + 6;
} 