import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState, Netlist } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";
import { useCircuitStore } from "../store/circuitStore";

interface LcdPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function LcdPart({part, selected, pinStates, netlist, onPinClick}: LcdPartProps) {
  const def = partDefinitions["lcd-16x2-i2c"];
  const powered = netlist?.isPowered(part.id) ?? false;

  const screen = useCircuitStore((s) => s.lcdScreens[part.id]);
  const lines: [string, string] = screen?.lines ?? ["", ""];
  const backlightOn = screen ? screen.backlightOn : powered;

  // Calculates directly from widthUnits (36) and new reduced heightUnits (12)
  const halfW = (def.widthUnits * GRID) / 2; // 18 * GRID
  const halfH = (def.heightUnits * GRID) / 2; // 6 * GRID (Much shorter PCB)
  const headerEdgeX = -halfW;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Green PCB Base - Auto-scaled to new shorter height */}
      <rect
        x={-halfW}
        y={-halfH}
        width={halfW * 2}
        height={halfH * 2}
        rx={6}
        fill="#1ca063"
        stroke={selected ? "#4da3ff" : "#127a44"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* PCB Corner Mounting Holes */}
      {[
        { x: -halfW + 10, y: -halfH + 10 },
        { x: halfW - 10, y: -halfH + 10 },
        { x: -halfW + 10, y: halfH - 10 },
        { x: halfW - 10, y: halfH - 10 },
      ].map((hole, i) => (
        <g key={`hole-${i}`} transform={`translate(${hole.x}, ${hole.y})`}>
          <circle r={4.5} fill="#c9c9c9" />
          <circle r={2.8} fill="#0a3d24" />
        </g>
      ))}

      {/* Top Header Contact Pads */}
      {Array.from({ length: 16 }).map((_, i) => {
        const x = -halfW + 14 + i * ((halfW * 2 - 28) / 15);
        return <rect key={i} x={x - 1.5} y={-halfH - 2} width={3} height={5} fill="#c9c9c9" rx={0.5} />;
      })}

      {/* Dark Metal Bezel Framework */}
      <rect
        x={-halfW + 20}
        y={-20}
        width={halfW * 2 - 40}
        height={40}
        rx={2}
        fill="#111827"
        stroke="#1f2937"
        strokeWidth={1}
      />

      {/* Screen Display Glass */}
      <rect
        x={-halfW + 25}
        y={-14}
        width={halfW * 2 - 50}
        height={28}
        rx={1}
        fill={backlightOn ? "#1e3a8a" : "#0f172a"}
      />

      {/* Backlight Glow Overlay */}
      {backlightOn && (
        <rect
          x={-halfW + 25}
          y={-14}
          width={halfW * 2 - 50}
          height={28}
          rx={1}
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
              x={-halfW + 29}
              y={row === 0 ? -3 : 8}
              fontSize={11}
              fontFamily="'Courier New', monospace"
              fontWeight={700}
              fill="#bfdbfe"
              letterSpacing={0.8}
            >
              {line}
            </text>
          ))}
        </g>
      )}

      {/* I2C Header Housing (Left Edge) */}
      <rect x={headerEdgeX - 8} y={-halfH + 6} width={8} height={(halfH - 6) * 2} fill="#1c1c1c" rx={1} />

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

      {/* Pin Labels on PCB */}
      {def.pins.map((pin) => (
        <text
          key={`label-${pin.id}`}
          x={headerEdgeX + 3}
          y={pin.y * GRID + 2.5}
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