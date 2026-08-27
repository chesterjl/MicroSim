import React from "react";
import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState, Netlist } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";

export function CapacitorPart({
  part,
  selected,
  pinStates,
  onPinClick,
}: {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}) {
  const def = partDefinitions.capacitor;
  const legHeight = 1.5 * GRID;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Angled Leads to bridge wide pin spacing to narrow capacitor body */}
      {def?.pins.map((pin) => {
        const pinX = pin.x * GRID;
        // Inner body connection point
        const bodyConnectionX = pin.x < 0 ? -0.4 * GRID : 0.4 * GRID;

        return (
          <path
            key={`leg-${pin.id}`}
            d={`M ${pinX} 0 L ${pinX} ${-legHeight * 0.4} L ${bodyConnectionX} ${-legHeight}`}
            fill="none"
            stroke="#cccccc"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Capacitor Body Container */}
      <g transform={`translate(0, ${-legHeight})`}>
        {/* Rubber Base Seal */}
        <rect
          x={-1.1 * GRID}
          y={-0.2 * GRID}
          width={2.2 * GRID}
          height={0.3 * GRID}
          rx={1}
          fill="#18181b"
          stroke="#27272a"
          strokeWidth={0.8}
        />

        {/* Main Can Outer Body */}
        <rect
          x={-1.2 * GRID}
          y={-2.5 * GRID}
          width={2.4 * GRID}
          height={2.3 * GRID}
          rx={2}
          fill="#09090b"
          stroke={selected ? "#06b6d4" : "#27272a"}
          strokeWidth={selected ? 2 : 1}
        />

        {/* Aluminum Top Vent Cap */}
        <path
          d={`M ${-1.2 * GRID} ${-2.3 * GRID} 
             C ${-1.2 * GRID} ${-2.6 * GRID}, ${1.2 * GRID} ${-2.6 * GRID}, ${1.2 * GRID} ${-2.3 * GRID} 
             L ${1.2 * GRID} ${-2.1 * GRID} 
             L ${-1.2 * GRID} ${-2.1 * GRID} Z`}
          fill="#3f3f46"
        />

        {/* Vent Stamp Cross */}
        <line
          x1={-0.3 * GRID}
          y1={-2.4 * GRID}
          x2={0.3 * GRID}
          y2={-2.4 * GRID}
          stroke="#18181b"
          strokeWidth={0.8}
        />
        <line
          x1={0}
          y1={-2.6 * GRID}
          x2={0}
          y2={-2.2 * GRID}
          stroke="#18181b"
          strokeWidth={0.8}
        />

        {/* Negative Stripe (Cathode Side - Right) */}
        <rect
          x={0.3 * GRID}
          y={-2.1 * GRID}
          width={0.8 * GRID}
          height={1.8 * GRID}
          fill="#27272a"
        />
        <line
          x1={0.5 * GRID}
          y1={-1.7 * GRID}
          x2={0.9 * GRID}
          y2={-1.7 * GRID}
          stroke="#a1a1aa"
          strokeWidth={1.2}
        />
        <line
          x1={0.5 * GRID}
          y1={-1.3 * GRID}
          x2={0.9 * GRID}
          y2={-1.3 * GRID}
          stroke="#a1a1aa"
          strokeWidth={1.2}
        />
        <line
          x1={0.5 * GRID}
          y1={-0.9 * GRID}
          x2={0.9 * GRID}
          y2={-0.9 * GRID}
          stroke="#a1a1aa"
          strokeWidth={1.2}
        />

        {/* Body Specular Highlight */}
        <path
          d={`M ${-1.0 * GRID} ${-2.0 * GRID} 
             L ${-0.7 * GRID} ${-2.0 * GRID} 
             L ${-0.7 * GRID} ${-0.4 * GRID} 
             L ${-1.0 * GRID} ${-0.4 * GRID} Z`}
          fill="#ffffff"
          opacity={0.08}
          className="pointer-events-none"
        />

        {/* Value Text Labels */}
        <text
          x={-0.3 * GRID}
          y={-1.3 * GRID}
          fill="#e4e4e7"
          fontSize={6}
          fontWeight="bold"
          fontFamily="monospace"
        >
          {(part.properties?.capacitance as string) ?? "10µF"}
        </text>
        <text
          x={-0.3 * GRID}
          y={-0.7 * GRID}
          fill="#a1a1aa"
          fontSize={5}
          fontFamily="monospace"
        >
          {(part.properties?.maxVoltage as string) ?? "25V"}
        </text>

        {/* Positive Indicator (+) Label */}
        <text
          x={-0.9 * GRID}
          y={-0.3 * GRID}
          fill="#06b6d4"
          fontSize={8}
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          +
        </text>
      </g>

      {/* Pin Connection Dots */}
      {def?.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={0}
          pinId={pin.id}
          label={pin.label}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}