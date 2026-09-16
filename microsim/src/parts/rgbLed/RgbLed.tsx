// parts/rgbLed/RgbLed.tsx
import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";
import { lerpColor } from "../../utils/color";

type Channel = "red" | "green" | "blue";

// Same values as led.tsx's COLOR_PALETTE for red/green/blue/white -- so a
// single-channel RGB LED looks identical to a regular LED of that color.
const CHANNEL_COLORS: Record<Channel, { off: string; on: string; glow: string }> = {
  red: { off: "#3a0000", on: "#ff2222", glow: "#ff4444" },
  green: { off: "#002400", on: "#22ff22", glow: "#44ff44" },
  blue: { off: "#000a30", on: "#2266ff", glow: "#4488ff" },
};

// Explicit combo colors instead of additive blending -- keys are the
// active channels sorted alphabetically ("blue+green", "blue+green+red", ...).
const COMBINATION_COLORS: Record<string, { off: string; on: string; glow: string }> = {
  "green+red": { off: "#302400", on: "#ffff22", glow: "#ffff44" },       // yellow
  "blue+red": { off: "#300030", on: "#ff22ff", glow: "#ff44ff" },        // magenta
  "blue+green": { off: "#003030", on: "#22ffff", glow: "#44ffff" },      // cyan
  "blue+green+red": { off: "#2a2a2a", on: "#ffffff", glow: "#ffffff" },  // white -- matches led.tsx's white
};

const OFF_COLOR = "#151515";
const CHARRED_BODY = "#151515";
const ACTIVE_THRESHOLD = 0.005;

function resolveColorTheme(active: Channel[]) {
  if (active.length === 0) return null;
  if (active.length === 1) return CHANNEL_COLORS[active[0]];
  const key = [...active].sort().join("+");
  return COMBINATION_COLORS[key] ?? CHANNEL_COLORS[active[0]];
}

interface RGBLedPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function RgbLedPart({ part, selected, pinStates, netlist, onPinClick }: RGBLedPartProps) {
  const def = partDefinitions["rgb-led"];

  const redBlown = netlist?.hasFlag("rgbLedBlown:red", part.id) ?? false;
  const greenBlown = netlist?.hasFlag("rgbLedBlown:green", part.id) ?? false;
  const blueBlown = netlist?.hasFlag("rgbLedBlown:blue", part.id) ?? false;
  const blown = redBlown || greenBlown || blueBlown;

  const redBrightness = blown ? 0 : netlist?.getRgbChannelBrightness(part.id, "red") ?? 0;
  const greenBrightness = blown ? 0 : netlist?.getRgbChannelBrightness(part.id, "green") ?? 0;
  const blueBrightness = blown ? 0 : netlist?.getRgbChannelBrightness(part.id, "blue") ?? 0;

  const activeChannels: Channel[] = [];
  if (redBrightness > ACTIVE_THRESHOLD) activeChannels.push("red");
  if (greenBrightness > ACTIVE_THRESHOLD) activeChannels.push("green");
  if (blueBrightness > ACTIVE_THRESHOLD) activeChannels.push("blue");

  const isLit = activeChannels.length > 0;
  const colorTheme = resolveColorTheme(activeChannels);
  // How intensely the resolved combo color shows -- driven by whichever
  // channel is brightest, since a dim secondary channel shouldn't wash
  // out a fully-lit primary one.
  const overallBrightness = isLit ? Math.max(redBrightness, greenBrightness, blueBrightness) : 0;

  const bodyColor = blown
    ? CHARRED_BODY
    : colorTheme
    ? lerpColor(colorTheme.off, colorTheme.on, overallBrightness)
    : OFF_COLOR;

  const centerOffsetX = 0.5 * GRID;
  const domeRadius = 1.8 * GRID;
  const bodyWidth = domeRadius * 2;
  const bodyHeight = domeRadius;

  const domePathD = `
    M ${centerOffsetX - bodyWidth / 2} 0
    L ${centerOffsetX - bodyWidth / 2} ${-bodyHeight}
    A ${bodyWidth / 2} ${bodyHeight} 0 1 1 ${centerOffsetX + bodyWidth / 2} ${-bodyHeight}
    L ${centerOffsetX + bodyWidth / 2} 0
    Z
  `;

  const readingSummary = !blown
    ? `R:${(redBrightness * 100).toFixed(0)}% G:${(greenBrightness * 100).toFixed(0)}% B:${(blueBrightness * 100).toFixed(0)}%`
    : "BURNED OUT";

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>RGB LED -- {readingSummary}</title>

      {isLit && !blown && colorTheme && (
        <path
          d={domePathD}
          fill={colorTheme.glow}
          opacity={0.6 * overallBrightness}
          style={{ filter: `blur(${2 + 8 * overallBrightness}px)` }}
          className="pointer-events-none"
        />
      )}

      <path
        d={domePathD}
        fill={bodyColor}
        stroke={blown ? "#7f1d1d" : selected ? "#4da3ff" : "#1a1a1a"}
        strokeWidth={blown || selected ? 2 : 1}
      />

      {isLit && !blown && colorTheme && (
        <ellipse
          cx={centerOffsetX}
          cy={-0.9 * GRID}
          rx={0.7 * GRID}
          ry={0.55 * GRID}
          fill={colorTheme.on}
          opacity={Math.min(0.85, overallBrightness)}
          className="pointer-events-none"
          style={{ filter: `blur(${1 + 2 * overallBrightness}px)` }}
        />
      )}

      {!blown && (
        <path
          d={`M ${centerOffsetX - 1.05 * GRID} ${-1.25 * GRID} A ${1.05 * GRID} ${1.05 * GRID} 0 0 1 ${centerOffsetX} ${-1.75 * GRID}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.5}
          opacity={0.4}
          className="pointer-events-none"
        />
      )}

      {blown && <OvercurrentBurst cx={centerOffsetX} cy={-domeRadius * 0.6} size={domeRadius * 1.4} />}

      {def?.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={0} x2={pin.x * GRID} y2={pin.y * GRID} />
          <Pin x={pin.x * GRID} y={pin.y * GRID} pinId={pin.id} label={pin.label} state={pinStates?.[pin.id]} onClick={(e) => onPinClick?.(pin.id, e)} />
        </g>
      ))}
    </g>
  );
}