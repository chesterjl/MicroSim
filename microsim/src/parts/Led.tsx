import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState, Netlist } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { Pin } from "./Pin";

const COLOR_PALETTE: Record<string, { off: string; on: string; glow: string }> = {
  red: { off: "#700000", on: "#ff2222", glow: "#ff4444" },
  green: { off: "#005500", on: "#22ff22", glow: "#44ff44" },
  blue: { off: "#001170", on: "#2266ff", glow: "#4488ff" },
  yellow: { off: "#705500", on: "#ffff22", glow: "#ffff44" },
  white: { off: "#555555", on: "#ffffff", glow: "#ffffff" },
};

interface LedPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function LedPart({part, selected, pinStates, netlist, onPinClick}: LedPartProps) {
  const rawColor = (part.properties?.color as string) ?? "red";
  const colorTheme = COLOR_PALETTE[rawColor.toLowerCase()] ?? COLOR_PALETTE.red;

  const isForwardBiased = pinStates?.anode === "high" && pinStates?.cathode === "low";

  // 2. Calculate dynamic brightness (0.0 to 1.0) based on circuit resistance
  const rawBrightness = netlist ? netlist.getPartBrightness(part.id) : 1;
  const brightness = isForwardBiased ? rawBrightness : 0;
  const isLit = brightness > 0;

  const def = partDefinitions.led;
  const legHeight = 1.8 * GRID;

  const domePathD = `M ${-1.8 * GRID} 0
                     L ${-1.8 * GRID} ${-1.8 * GRID}
                     A ${1.8 * GRID} ${1.8 * GRID} 0 1 1 ${1.8 * GRID} ${-1.8 * GRID}
                     L ${1.8 * GRID} 0 Z`;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>

      {/* LED Pins/Legs (Preserved exact design & anode bend) */}
      {def?.pins.map((pin) => {
        const isAnode = pin.id === "anode";
        const pinX = pin.x * GRID;
        const pinY = legHeight;

        if (isAnode) {
          const midY = legHeight * 0.45;
          return (
            <path
              key={`leg-${pin.id}`}
              d={`M ${pinX} 0
                 L ${pinX - 3} ${midY}
                 L ${pinX} ${midY + 3}
                 L ${pinX} ${pinY}`}
              fill="none"
              stroke="#c7c7c7"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }

        return (
          <line
            key={`leg-${pin.id}`}
            x1={pinX}
            y1={0}
            x2={pinX}
            y2={pinY}
            stroke="#c7c7c7"
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Dynamic Glow Aura - Scaled blur & opacity around body */}
      {isLit && (
        <path
          d={domePathD}
          fill={colorTheme.glow}
          opacity={Math.min(0.8, 0.5 * brightness)}
          style={{ filter: `blur(${Math.max(2, 8 * brightness)}px)` }}
          className="pointer-events-none"
        />
      )}

      {/* 1. Base Opaque Plastic Body (Always 100% solid dark OFF color) */}
      <path
        d={domePathD}
        fill={colorTheme.off}
        stroke={selected ? "#4da3ff" : "#1a1a1a"}
        strokeWidth={selected ? 2.5 : 1}
      />

      {/* 2. Light Emission Layer (Paints light OVER the solid base without making base transparent) */}
      {isLit && (
        <path
          d={domePathD}
          fill={colorTheme.on}
          opacity={brightness}
          className="pointer-events-none"
        />
      )}

      {/* Glass Highlight Specular Reflection */}
      <path
        d={`M ${-1.2 * GRID} ${-1.2 * GRID}
           A ${1.2 * GRID} ${1.2 * GRID} 0 0 1 ${0} ${-1.7 * GRID}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.5}
        opacity={0.4}
        className="pointer-events-none"
      />

      {/* Pin dots */}
      {def?.pins.map((pin) => (
        <Pin
          key={pin.id}
          x={pin.x * GRID}
          y={legHeight}
          pinId={pin.id}
          label={pin.label}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}