import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { lerpColor } from "../../utils/color";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

const CHANNEL_COLORS: Record<"red" | "green" | "blue", { off: string; on: string; glow: string }> = {
  red: { off: "#3b1111", on: "#ff5555", glow: "#ff4444" },
  green: { off: "#113b11", on: "#55ff55", glow: "#44ff44" },
  blue: { off: "#11183b", on: "#5588ff", glow: "#4488ff" },
};

const CHARRED_BODY = "#151515";
const CHARRED_DIE = "#1a1108";

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
  // If any channel exceeded its safe current, treat the whole package as
  // destroyed -- a real RGB LED's dies share a package/substrate, so one
  // channel burning out is a reasonable proxy for the whole part failing.
  const blown = redBlown || greenBlown || blueBlown;

  const redBrightness = blown ? 0 : netlist?.getRgbChannelBrightness(part.id, "red") ?? 0;
  const greenBrightness = blown ? 0 : netlist?.getRgbChannelBrightness(part.id, "green") ?? 0;
  const blueBrightness = blown ? 0 : netlist?.getRgbChannelBrightness(part.id, "blue") ?? 0;

  const isLit = redBrightness > 0.005 || greenBrightness > 0.005 || blueBrightness > 0.005;

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

  const redDieColor = blown ? CHARRED_DIE : lerpColor(CHANNEL_COLORS.red.off, CHANNEL_COLORS.red.on, redBrightness);
  const greenDieColor = blown ? CHARRED_DIE : lerpColor(CHANNEL_COLORS.green.off, CHANNEL_COLORS.green.on, greenBrightness);
  const blueDieColor = blown ? CHARRED_DIE : lerpColor(CHANNEL_COLORS.blue.off, CHANNEL_COLORS.blue.on, blueBrightness);

  const mixedTint = `rgb(${Math.round(255 * redBrightness)}, ${Math.round(255 * greenBrightness)}, ${Math.round(255 * blueBrightness)})`;

  const readingSummary = !blown
    ? `R:${(redBrightness * 100).toFixed(0)}% G:${(greenBrightness * 100).toFixed(0)}% B:${(blueBrightness * 100).toFixed(0)}%`
    : "BURNED OUT";

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>RGB LED -- {readingSummary}</title>

      {isLit && !blown && (
        <>
          {redBrightness > 0.005 && (
            <path d={domePathD} fill={CHANNEL_COLORS.red.glow} opacity={0.5 * redBrightness} style={{ filter: `blur(${2 + 6 * redBrightness}px)` }} className="pointer-events-none" />
          )}
          {greenBrightness > 0.005 && (
            <path d={domePathD} fill={CHANNEL_COLORS.green.glow} opacity={0.5 * greenBrightness} style={{ filter: `blur(${2 + 6 * greenBrightness}px)` }} className="pointer-events-none" />
          )}
          {blueBrightness > 0.005 && (
            <path d={domePathD} fill={CHANNEL_COLORS.blue.glow} opacity={0.5 * blueBrightness} style={{ filter: `blur(${2 + 6 * blueBrightness}px)` }} className="pointer-events-none" />
          )}
        </>
      )}

      <path d={domePathD} fill={blown ? CHARRED_BODY : "#151515"} stroke={blown ? "#7f1d1d" : selected ? "#4da3ff" : "#1a1a1a"} strokeWidth={blown || selected ? 2 : 1} />

      <ellipse cx={centerOffsetX} cy={-0.65 * GRID} rx={0.95 * GRID} ry={0.48 * GRID} fill="#252525" stroke="#333333" strokeWidth={1} opacity={0.9} className="pointer-events-none" />

      <ellipse cx={centerOffsetX - 0.62 * GRID} cy={-0.7 * GRID} rx={0.48 * GRID} ry={0.36 * GRID} fill={redDieColor} className="pointer-events-none" style={redBrightness > 0.005 ? { filter: `blur(${1 + 2 * redBrightness}px)` } : undefined} />
      <ellipse cx={centerOffsetX} cy={-0.7 * GRID} rx={0.48 * GRID} ry={0.36 * GRID} fill={greenDieColor} className="pointer-events-none" style={greenBrightness > 0.005 ? { filter: `blur(${1 + 2 * greenBrightness}px)` } : undefined} />
      <ellipse cx={centerOffsetX + 0.62 * GRID} cy={-0.7 * GRID} rx={0.48 * GRID} ry={0.36 * GRID} fill={blueDieColor} className="pointer-events-none" style={blueBrightness > 0.005 ? { filter: `blur(${1 + 2 * blueBrightness}px)` } : undefined} />

      {isLit && !blown && (
        <path d={domePathD} fill={mixedTint} opacity={0.4} className="pointer-events-none" style={{ mixBlendMode: "screen" }} />
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