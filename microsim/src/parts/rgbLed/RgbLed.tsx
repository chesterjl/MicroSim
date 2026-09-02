import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";

const COLOR_PALETTE: Record<string, { off: string; on: string; glow: string }> = {
  red: { off: "#700000", on: "#ff2222", glow: "#ff4444" },
  green: { off: "#005500", on: "#22ff22", glow: "#44ff44" },
  blue: { off: "#001170", on: "#2266ff", glow: "#4488ff" },
};

const RGB_COLORS = {
  red: COLOR_PALETTE.red,
  green: COLOR_PALETTE.green,
  blue: COLOR_PALETTE.blue,
};

interface RGBLedPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function RgbLedPart({ part, selected, pinStates, netlist, onPinClick }: RGBLedPartProps) {
  const def = partDefinitions["rgb-led"];

  const redState = pinStates?.red;
  const greenState = pinStates?.green;
  const blueState = pinStates?.blue;
  const gndState = pinStates?.gnd;

  const redForward = redState === "HIGH" && gndState === "LOW";
  const greenForward = greenState === "HIGH" && gndState === "LOW";
  const blueForward = blueState === "HIGH" && gndState === "LOW";

  const redBrightness = redForward
    ? netlist?.getRgbChannelBrightness(part.id, "red") ?? 0
    : 0;
  const greenBrightness = greenForward
    ? netlist?.getRgbChannelBrightness(part.id, "green") ?? 0
    : 0;
  const blueBrightness = blueForward
    ? netlist?.getRgbChannelBrightness(part.id, "blue") ?? 0
    : 0;

  const isLit = redBrightness > 0 || greenBrightness > 0 || blueBrightness > 0;

  // Center offset to align the bulb body over pin span [-1 to 2] (center at 0.5)
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

  const channelOpacity = {
    red: Math.min(1, redBrightness),
    green: Math.min(1, greenBrightness),
    blue: Math.min(1, blueBrightness),
  };

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {isLit && (
        <>
          {redBrightness > 0 && (
            <path
              d={domePathD}
              fill={RGB_COLORS.red.glow}
              opacity={Math.min(0.75, 0.45 * redBrightness)}
              style={{
                filter: `blur(${Math.max(2, 8 * redBrightness)}px)`,
              }}
              className="pointer-events-none"
            />
          )}

          {greenBrightness > 0 && (
            <path
              d={domePathD}
              fill={RGB_COLORS.green.glow}
              opacity={Math.min(0.75, 0.45 * greenBrightness)}
              style={{
                filter: `blur(${Math.max(2, 8 * greenBrightness)}px)`,
              }}
              className="pointer-events-none"
            />
          )}

          {blueBrightness > 0 && (
            <path
              d={domePathD}
              fill={RGB_COLORS.blue.glow}
              opacity={Math.min(0.75, 0.45 * blueBrightness)}
              style={{
                filter: `blur(${Math.max(2, 8 * blueBrightness)}px)`,
              }}
              className="pointer-events-none"
            />
          )}
        </>
      )}

      {/* Main Glass Dome Body */}
      <path
        d={domePathD}
        fill="#151515"
        stroke={selected ? "#4da3ff" : "#1a1a1a"}
        strokeWidth={selected ? 2.5 : 1}
      />

      {/* Internal Substrate Plate */}
      <ellipse
        cx={centerOffsetX}
        cy={-0.65 * GRID}
        rx={0.95 * GRID}
        ry={0.48 * GRID}
        fill="#252525"
        stroke="#333333"
        strokeWidth={1}
        opacity={0.9}
        className="pointer-events-none"
      />

      {/* Active Light Emitting Elements */}
      {redBrightness > 0 && (
        <ellipse
          cx={centerOffsetX - 0.62 * GRID}
          cy={-0.7 * GRID}
          rx={0.48 * GRID}
          ry={0.36 * GRID}
          fill={RGB_COLORS.red.on}
          opacity={channelOpacity.red}
          className="pointer-events-none"
          style={{
            filter: `blur(${Math.max(0, 2 * redBrightness)}px)`,
          }}
        />
      )}

      {greenBrightness > 0 && (
        <ellipse
          cx={centerOffsetX}
          cy={-0.7 * GRID}
          rx={0.48 * GRID}
          ry={0.36 * GRID}
          fill={RGB_COLORS.green.on}
          opacity={channelOpacity.green}
          className="pointer-events-none"
          style={{
            filter: `blur(${Math.max(0, 2 * greenBrightness)}px)`,
          }}
        />
      )}

      {blueBrightness > 0 && (
        <ellipse
          cx={centerOffsetX + 0.62 * GRID}
          cy={-0.7 * GRID}
          rx={0.48 * GRID}
          ry={0.36 * GRID}
          fill={RGB_COLORS.blue.on}
          opacity={channelOpacity.blue}
          className="pointer-events-none"
          style={{
            filter: `blur(${Math.max(0, 2 * blueBrightness)}px)`,
          }}
        />
      )}

      {isLit && (
        <path
          d={domePathD}
          fill={`rgb(
            ${Math.round(255 * redBrightness)}
            ${Math.round(255 * greenBrightness)}
            ${Math.round(255 * blueBrightness)}
          )`}
          opacity={0.45}
          className="pointer-events-none"
          style={{
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* Glass Highlight Line */}
      <path
        d={`
          M ${centerOffsetX - 1.05 * GRID} ${-1.25 * GRID}
          A ${1.05 * GRID} ${1.05 * GRID}
          0 0 1
          ${centerOffsetX} ${-1.75 * GRID}
        `}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.5}
        opacity={0.4}
        className="pointer-events-none"
      />

      {/* Internal LED Dies */}
      <circle
        cx={centerOffsetX - 0.62 * GRID}
        cy={-0.7 * GRID}
        r={0.11 * GRID}
        fill={redBrightness > 0 ? "#ff6666" : "#3b1111"}
        opacity={0.9}
        className="pointer-events-none"
      />

      <circle
        cx={centerOffsetX}
        cy={-0.7 * GRID}
        r={0.11 * GRID}
        fill={greenBrightness > 0 ? "#66ff66" : "#113b11"}
        opacity={0.9}
        className="pointer-events-none"
      />

      <circle
        cx={centerOffsetX + 0.62 * GRID}
        cy={-0.7 * GRID}
        r={0.11 * GRID}
        fill={blueBrightness > 0 ? "#6688ff" : "#11183b"}
        opacity={0.9}
        className="pointer-events-none"
      />

      {/* Pin Dots defined strictly by partDefinitions.ts */}
      {def?.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={0} x2={pin.x * GRID} y2={pin.y * GRID}/>
          <Pin
            x={pin.x * GRID}
            y={pin.y * GRID}
            pinId={pin.id}
            label={pin.label}
            state={pinStates?.[pin.id]}
            onClick={(e) => onPinClick?.(pin.id, e)}
          />
        </g>
      ))}
    </g>
  );
}