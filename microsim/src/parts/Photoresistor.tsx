import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";

export function PhotoresistorPart({
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
  const def = partDefinitions.photoresistor;
  const lightLevel = (part.properties?.lightLevel as number) ?? 0.5;

  const bodyRx = 1.6 * GRID;
  const bodyRy = 1.3 * GRID;
  const legTipY = 3.6 * GRID;

  const bodyFill = `rgb(${210 - lightLevel * 20}, ${
    200 - lightLevel * 10 + lightLevel * 30
  }, ${170 + lightLevel * 40})`;

  const trackX = bodyRx * 0.45;

  return (
    <g
      transform={`translate(${part.x}, ${part.y}) rotate(${
        part.rotation ?? 0
      })`}
    >
      {/* Legs */}
      <line
        x1={-1 * GRID}
        y1={bodyRy * 0.7}
        x2={-1 * GRID}
        y2={legTipY}
        stroke="#9ca3af"
        strokeWidth={2}
      />
      <line
        x1={1 * GRID}
        y1={bodyRy * 0.7}
        x2={1 * GRID}
        y2={legTipY}
        stroke="#9ca3af"
        strokeWidth={2}
      />

      {/* Outer orange ring */}
      <ellipse
        cx={0}
        cy={0}
        rx={bodyRx}
        ry={bodyRy}
        fill="#c46a2e"
        stroke={selected ? "#4da3ff" : "#7a3d16"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Cream/tan photosensitive face */}
      <ellipse
        cx={0}
        cy={0}
        rx={bodyRx * 0.82}
        ry={bodyRy * 0.8}
        fill={bodyFill}
      />

      {/* Side contact dots */}
      <circle
        cx={-bodyRx * 0.55}
        cy={0}
        r={0.15 * GRID}
        fill="#b89368"
        opacity={0.6}
      />
      <circle
        cx={bodyRx * 0.55}
        cy={0}
        r={0.15 * GRID}
        fill="#b89368"
        opacity={0.6}
      />

      {/* Serpent S-curve conductive track */}
      <path
        d={`
          M ${bodyRx * 0.48} ${bodyRy * 0.52}
          L ${-trackX} ${bodyRy * 0.52}
          A ${0.2 * GRID} ${0.2 * GRID} 0 0 1 ${-trackX} ${bodyRy * 0.22}
          L ${trackX} ${bodyRy * 0.22}
          A ${0.2 * GRID} ${0.2 * GRID} 0 0 0 ${trackX} ${-bodyRy * 0.08}
          L ${-trackX} ${-bodyRy * 0.08}
          A ${0.2 * GRID} ${0.2 * GRID} 0 0 1 ${-trackX} ${-bodyRy * 0.38}
          L ${trackX} ${-bodyRy * 0.38}
          A ${0.2 * GRID} ${0.2 * GRID} 0 0 0 ${trackX} ${-bodyRy * 0.68}
          L ${-bodyRx * 0.25} ${-bodyRy * 0.68}
        `}
        fill="none"
        stroke="#c46a2e"
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Glow overlay when brightly lit */}
      {lightLevel > 0.6 && (
        <ellipse
          cx={0}
          cy={0}
          rx={bodyRx * 0.82}
          ry={bodyRy * 0.8}
          fill="#fff7cc"
          opacity={(lightLevel - 0.6) * 0.5}
          className="pointer-events-none"
        />
      )}

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