import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState, Netlist } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";
import { useCircuitStore } from "../store/circuitStore";

interface Lcd20x4I2CPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function Lcd20x4I2CPart({
  part,
  selected,
  pinStates,
  netlist,
  onPinClick,
}: Lcd20x4I2CPartProps) {
  const def = partDefinitions["lcd-20x4-i2c"];
  const powered = netlist?.isPowered(part.id) ?? false;

  const screen = useCircuitStore((s) => s.lcdScreens[part.id]);
  const rawLines: string[] = screen?.lines ?? ["", "", "", ""];

  // Format all 4 lines strictly to 20 characters
  const lines = Array.from({ length: 4 }).map((_, i) =>
    (rawLines[i] ?? "").padEnd(20, " ").slice(0, 20)
  );

  const backlightOn = screen ? screen.backlightOn : powered;

  const halfW = (def.widthUnits * GRID) / 2;
  const halfH = (def.heightUnits * GRID) / 2;
  const headerEdgeX = -halfW;

  const ROWS = 4;

  // Outer Bezel dimensions
  const outerBezelX = -halfW + 18;
  const outerBezelY = -halfH + 8;
  const outerBezelW = halfW * 2 - 28;
  const outerBezelH = halfH * 2 - 16;

  // Screen Glass dimensions inside bezel
  const screenLeft = outerBezelX + 10;
  const screenTop = outerBezelY + 8;
  const screenWidth = outerBezelW - 20;
  const screenHeight = outerBezelH - 16;

  const rowHeight = screenHeight / ROWS;

  return (
    <g
      transform={`translate(${part.x}, ${part.y}) rotate(${
        part.rotation ?? 0
      })`}
    >
      {/* Green PCB Base */}
      <rect
        x={-halfW}
        y={-halfH}
        width={halfW * 2}
        height={halfH * 2}
        rx={4}
        fill="#0e7a46"
        stroke={selected ? "#4da3ff" : "#0a5c34"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Black Outer Bezel/Border */}
      <rect
        x={outerBezelX}
        y={outerBezelY}
        width={outerBezelW}
        height={outerBezelH}
        rx={2}
        fill="#000000"
      />

      {/* LCD Screen Glass (Blue Theme) */}
      <rect
        x={screenLeft}
        y={screenTop}
        width={screenWidth}
        height={screenHeight}
        rx={2}
        fill={backlightOn ? "#1e3a8a" : "#0f172a"}
      />

      {/* Backlight Glow Overlay */}
      {backlightOn && (
        <rect
          x={screenLeft}
          y={screenTop}
          width={screenWidth}
          height={screenHeight}
          rx={2}
          fill="#3b82f6"
          opacity={0.15}
        />
      )}

      {/* LCD Text Rows */}
      {backlightOn && (
        <g style={{ pointerEvents: "none" }}>
          {lines.map((line, row) => (
            <text
              key={row}
              x={screenLeft + 10}
              y={screenTop + row * rowHeight + rowHeight * 0.72}
              fontSize={13}
              fontFamily="monospace"
              fontWeight={700}
              fill="#bfdbfe"
              letterSpacing={1.8}
            >
              {line}
            </text>
          ))}
        </g>
      )}

      {/* Upper-Left Pin Header Housing */}
      <rect
        x={headerEdgeX - 6}
        y={-halfH + 6}
        width={6}
        height={38}
        fill="#1c1c1c"
        rx={1}
      />

      {/* Connection Leg Lines */}
      {def.pins.map((pin) => (
        <line
          key={`leg-${pin.id}`}
          x1={headerEdgeX}
          y1={pin.y * GRID}
          x2={pin.x * GRID}
          y2={pin.y * GRID}
          stroke="#c9c9c9"
          strokeWidth={2}
        />
      ))}

      {/* Pin Labels */}
      {def.pins.map((pin) => (
        <text
          key={`label-${pin.id}`}
          x={headerEdgeX + 8}
          y={pin.y * GRID + 2}
          textAnchor="start"
          fontSize={5.5}
          fontWeight={700}
          fill="#eafff2"
          fontFamily="monospace"
        >
          {pin.label}
        </text>
      ))}

      {/* Interactive Pin Terminals */}
      {def.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={pin.y * GRID}
          pinId={pin.id}
          label={pin.label}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}