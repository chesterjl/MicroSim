import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import type { Netlist, NetState } from "../../engine/netlist";
import { lerpColor } from "../../utils/color";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

const COLOR_PALETTE: Record<string, { off: string; on: string; glow: string }> = {
  red: { off: "#3a0000", on: "#ff2222", glow: "#ff4444" },
  green: { off: "#002400", on: "#22ff22", glow: "#44ff44" },
  blue: { off: "#000a30", on: "#2266ff", glow: "#4488ff" },
  yellow: { off: "#302400", on: "#ffff22", glow: "#ffff44" },
  white: { off: "#2a2a2a", on: "#ffffff", glow: "#ffffff" },
};

const CHARRED_BODY = "#1a1108";
const CHARRED_STROKE = "#7f1d1d";

interface LedPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function LedPart({ part, selected, pinStates, netlist, onPinClick }: LedPartProps) {
  const rawColor = (part.properties?.color as string) ?? "red";
  const colorTheme = COLOR_PALETTE[rawColor.toLowerCase()] ?? COLOR_PALETTE.red;

  // Real current-derived brightness -- already 0 for reverse bias,
  // insufficient voltage, or a blown junction (see ledModel.getBrightness).
  const brightness = netlist?.getPartBrightness(part.id) ?? 0;
  const isLit = brightness > 0.005;

  const reversed = netlist?.hasFlag("ledReversed", part.id) ?? false;
  const blown = netlist?.hasFlag("ledBlown", part.id) ?? false;
  const reading = netlist?.getElectricalReading(part.id) ?? null;

  // Continuous off->on color interpolation instead of opacity-stacking a
  // fixed "on" swatch -- gives every brightness level a genuinely distinct
  // shade rather than just "how much on-color leaks through."
  const bodyColor = blown ? CHARRED_BODY : lerpColor(colorTheme.off, colorTheme.on, brightness);

  const def = partDefinitions.led;
  const legHeight = 1.8 * GRID;
  const domeRadius = 1.8 * GRID;

  const domePathD = `M ${-domeRadius} 0
                     L ${-domeRadius} ${-domeRadius}
                     A ${domeRadius} ${domeRadius} 0 1 1 ${domeRadius} ${-domeRadius}
                     L ${domeRadius} 0 Z`;

  const tooltip = reading
    ? blown
      ? `${rawColor.toUpperCase()} LED -- BURNED OUT (${(reading.currentAmps * 1000).toFixed(1)}mA exceeded rated max)`
      : `${rawColor.toUpperCase()} LED -- ${(reading.currentAmps * 1000).toFixed(1)}mA @ ${reading.loopVoltage.toFixed(2)}V${reversed ? " (reversed!)" : ""}`
    : undefined;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {tooltip && <title>{tooltip}</title>}

      {/* LED Pins/Legs */}
      {def?.pins.map((pin) => {
        const isAnode = pin.id === "anode";
        const pinX = pin.x * GRID;
        const pinY = legHeight;

        if (isAnode) {
          const midY = legHeight * 0.45;
          return (
            <path
              key={`leg-${pin.id}`}
              d={`M ${pinX} 0 L ${pinX - 3} ${midY} L ${pinX} ${midY + 3} L ${pinX} ${pinY}`}
              fill="none"
              stroke="#c7c7c7"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }

        return (
          <line key={`leg-${pin.id}`} x1={pinX} y1={0} x2={pinX} y2={pinY} stroke="#c7c7c7" strokeWidth={2} strokeLinecap="round" />
        );
      })}

      {/* Glow -- purely multiplicative with brightness now, so 0 brightness gives literally 0 opacity, not a visible floor. */}
      {isLit && !blown && (
        <path
          d={domePathD}
          fill={colorTheme.glow}
          opacity={0.6 * brightness}
          style={{ filter: `blur(${2 + 8 * brightness}px)` }}
          className="pointer-events-none"
        />
      )}

      {/* Body */}
      <path
        d={domePathD}
        fill={bodyColor}
        stroke={blown ? CHARRED_STROKE : reversed ? "#f97316" : selected ? "#4da3ff" : "#1a1a1a"}
        strokeWidth={blown || reversed ? 2 : selected ? 2.5 : 1}
      />

      {/* Inner emissive core -- "hot center" that only shows with real current. */}
      {isLit && !blown && (
        <ellipse
          cx={0}
          cy={-0.9 * GRID}
          rx={0.7 * GRID}
          ry={0.55 * GRID}
          fill={colorTheme.on}
          opacity={Math.min(0.85, brightness)}
          className="pointer-events-none"
          style={{ filter: `blur(${1 + 2 * brightness}px)` }}
        />
      )}

      {/* Glass Highlight */}
      {!blown && (
        <path
          d={`M ${-1.2 * GRID} ${-1.2 * GRID} A ${1.2 * GRID} ${1.2 * GRID} 0 0 1 ${0} ${-1.7 * GRID}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.5}
          opacity={0.4}
          className="pointer-events-none"
        />
      )}

      {blown && <OvercurrentBurst cx={0} cy={-domeRadius * 0.6} size={domeRadius * 1.4} />}

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