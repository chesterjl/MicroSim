import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";

export function ServoMG90Part({
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
  const def = partDefinitions["servo-mg90"];

  const bodyWidth = 10 * GRID;
  const bodyTop = -7 * GRID;
  const bodyBottom = 7 * GRID;

  // Must match partDefinition.ts
  const pinY = -10 * GRID;

  return (
    <g
      transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}
    >
      {/* =========================
          3-pin servo connector
         ========================= */}

      {/* Connector cable/neck */}
      <rect
        x={-4 * GRID}
        y={-9 * GRID}
        width={8 * GRID}
        height={3 * GRID}
        rx={0.6 * GRID}
        fill="#18181B"
        stroke="#09090B"
        strokeWidth={1}
      />

      {/* Connector top */}
      <rect
        x={-4 * GRID}
        y={-10.5 * GRID}
        width={8 * GRID}
        height={1.8 * GRID}
        rx={0.4 * GRID}
        fill="#27272A"
        stroke="#09090B"
        strokeWidth={1}
      />

      {/* Connector holes */}
      {[-2.5, 0, 2.5].map((x, i) => (
        <rect
          key={`connector-hole-${i}`}
          x={(x - 0.65) * GRID}
          y={-10.15 * GRID}
          width={1.3 * GRID}
          height={1 * GRID}
          rx={0.2 * GRID}
          fill="#09090B"
        />
      ))}

      {/* =========================
          Physical pin leads
         ========================= */}

      {def.pins.map((pin) => (
        <line
          key={`leg-${pin.id}`}
          x1={pin.x * GRID}
          y1={bodyTop}
          x2={pin.x * GRID}
          y2={pinY}
          stroke="#A1A1AA"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      ))}

      {/* =========================
          Main servo body
         ========================= */}

      <rect
        x={-bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={14 * GRID}
        rx={0.8 * GRID}
        fill="#1684C4"
        stroke={selected ? "#4da3ff" : "#075985"}
        strokeWidth={selected ? 2 : 1.2}
      />

      {/* Left mounting rail */}
      <rect
        x={-5.8 * GRID}
        y={-5.5 * GRID}
        width={1.5 * GRID}
        height={11 * GRID}
        rx={0.3 * GRID}
        fill="#0F6FA8"
        stroke="#075985"
        strokeWidth={0.8}
      />

      {/* Right mounting rail */}
      <rect
        x={4.3 * GRID}
        y={-5.5 * GRID}
        width={1.5 * GRID}
        height={11 * GRID}
        rx={0.3 * GRID}
        fill="#0F6FA8"
        stroke="#075985"
        strokeWidth={0.8}
      />

      {/* Mounting holes */}
      <circle
        cx={-5.05 * GRID}
        cy={-4.5 * GRID}
        r={0.75 * GRID}
        fill="#0A5A88"
        stroke="#38BDF8"
        strokeWidth={0.7}
      />

      <circle
        cx={5.05 * GRID}
        cy={-4.5 * GRID}
        r={0.75 * GRID}
        fill="#0A5A88"
        stroke="#38BDF8"
        strokeWidth={0.7}
      />

      <circle
        cx={-5.05 * GRID}
        cy={5 * GRID}
        r={0.75 * GRID}
        fill="#0A5A88"
        stroke="#38BDF8"
        strokeWidth={0.7}
      />

      <circle
        cx={5.05 * GRID}
        cy={5 * GRID}
        r={0.75 * GRID}
        fill="#0A5A88"
        stroke="#38BDF8"
        strokeWidth={0.7}
      />

      {/* =========================
          Gear / servo output
         ========================= */}

      <circle
        cx={0}
        cy={0}
        r={2.8 * GRID}
        fill="#E5E7EB"
        stroke="#6B7280"
        strokeWidth={1}
      />

      {/* Gear teeth */}
      <path
        d={`
          M ${-1.2 * GRID} ${-2.5 * GRID}
          L ${-0.8 * GRID} ${-3.1 * GRID}
          L ${0.8 * GRID} ${-3.1 * GRID}
          L ${1.2 * GRID} ${-2.5 * GRID}
          L ${2.5 * GRID} ${-1.2 * GRID}
          L ${3.1 * GRID} ${-0.8 * GRID}
          L ${3.1 * GRID} ${0.8 * GRID}
          L ${2.5 * GRID} ${1.2 * GRID}
          L ${1.2 * GRID} ${2.5 * GRID}
          L ${0.8 * GRID} ${3.1 * GRID}
          L ${-0.8 * GRID} ${3.1 * GRID}
          L ${-1.2 * GRID} ${2.5 * GRID}
          L ${-2.5 * GRID} ${1.2 * GRID}
          L ${-3.1 * GRID} ${0.8 * GRID}
          L ${-3.1 * GRID} ${-0.8 * GRID}
          L ${-2.5 * GRID} ${-1.2 * GRID}
          Z
        `}
        fill="#F3F4F6"
        stroke="#9CA3AF"
        strokeWidth={0.8}
      />

      {/* Output shaft */}
      <circle
        cx={0}
        cy={0}
        r={1.15 * GRID}
        fill="#D1D5DB"
        stroke="#6B7280"
        strokeWidth={0.8}
      />

      <circle
        cx={0}
        cy={0}
        r={0.45 * GRID}
        fill="#71717A"
      />

      {/* =========================
          Servo horn
         ========================= */}

      <rect
        x={-0.65 * GRID}
        y={-5.3 * GRID}
        width={1.3 * GRID}
        height={5.3 * GRID}
        rx={0.6 * GRID}
        fill="#E5E7EB"
        stroke="#9CA3AF"
        strokeWidth={0.8}
      />

      {/* Horn holes */}
      {[-3.8, -2.4, -1].map((y, i) => (
        <circle
          key={`horn-hole-${i}`}
          cx={0}
          cy={y * GRID}
          r={0.28 * GRID}
          fill="#6B7280"
        />
      ))}

      {/* =========================
          Pin dots
         ========================= */}

      {def.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={pinY}
          pinId={pin.id}
          label={pin.label}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}