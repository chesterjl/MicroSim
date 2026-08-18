import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState, Netlist } from "../netlist";
import { partDefinitions } from "../partDefinitions";
import { PinDot } from "./PinDot";

export function LcdPart({
  part,
  selected,
  pinStates,
  netlist,
  onPinClick,
}: {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}) {
  const def = partDefinitions["lcd-16x2-i2c"];
  const powered = netlist?.isPowered(part.id) ?? false;

  const halfW = (def.widthUnits * GRID) / 2; // 90
  const halfH = (def.heightUnits * GRID) / 2; // 40
  const headerEdgeX = -halfW; // where the pin header housing meets the board edge

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Green PCB */}
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

      {/* Mounting holes, one per corner */}
      {[
        { x: -halfW + 12, y: -halfH + 12 },
        { x: halfW - 12, y: -halfH + 12 },
        { x: -halfW + 12, y: halfH - 12 },
        { x: halfW - 12, y: halfH - 12 },
      ].map((hole, i) => (
        <g key={`hole-${i}`} transform={`translate(${hole.x}, ${hole.y})`}>
          <circle r={5} fill="#c9c9c9" />
          <circle r={3} fill="#0a3d24" />
        </g>
      ))}

      {/* Decorative I2C backpack header along the top -- not wired to anything */}
      {Array.from({ length: 16 }).map((_, i) => {
        const x = -halfW + 14 + i * ((halfW * 2 - 28) / 15);
        return <rect key={i} x={x - 1.5} y={-halfH - 3} width={3} height={7} fill="#c9c9c9" />;
      })}

      {/* Bezel */}
      <rect x={-halfW + 20} y={-24} width={halfW * 2 - 40} height={48} rx={3} fill="#1a1a1a" />

      {/* Screen -- backlight color reflects whether VCC+GND actually reach power/ground */}
      <rect
        x={-halfW + 28}
        y={-16}
        width={halfW * 2 - 56}
        height={32}
        fill={powered ? "#1d3f75" : "#0c1a2e"}
      />
      {powered && (
        <rect x={-halfW + 28} y={-16} width={halfW * 2 - 56} height={32} fill="#2e6fd6" opacity={0.25} />
      )}

      {/* Faint 16x2 character-cell grid, purely decorative */}
      {powered &&
        Array.from({ length: 16 }).map((_, col) => (
          <line
            key={col}
            x1={-halfW + 30 + col * ((halfW * 2 - 60) / 16)}
            y1={-15}
            x2={-halfW + 30 + col * ((halfW * 2 - 60) / 16)}
            y2={15}
            stroke="#3a5f9a"
            strokeWidth={0.5}
            opacity={0.4}
          />
        ))}

      {/* Pin header housing, left edge */}
      <rect x={headerEdgeX - 10} y={-38} width={10} height={76} fill="#1c1c1c" />

      {/* Legs + labels for GND / VCC / SDA / SCL, printed ON the PCB so they
          stay readable regardless of what the pins are wired into. */}
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

      {def.pins.map((pin) => (
        <text
          key={`label-${pin.id}`}
          x={headerEdgeX + 4}
          y={pin.y * GRID + 3}
          textAnchor="start"
          fontSize={6}
          fontWeight={700}
          fill="#eafff2"
          fontFamily="monospace"
        >
          {pin.label}
        </text>
      ))}

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