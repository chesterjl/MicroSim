import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { useCircuitStore } from "../../store/circuitStore";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLabel } from "../../components/parts/pin/PinLabel";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { HD44780_FONT, HD44780_FONT_FALLBACK } from "../../engine/hd44780Font";
import { CHAR_BLOCK_H, CHAR_BLOCK_W, CHAR_GAP_X, DOT_PITCH, DOT_SIZE, DOTS_W, ROW_GAP_Y } from "../../engine/i2cLcdDevice";

interface Lcd20x4I2CPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

const COLS = 20;
const ROWS = 4;

const CONTENT_WIDTH = COLS * CHAR_BLOCK_W + (COLS - 1) * CHAR_GAP_X;
const CONTENT_HEIGHT = ROWS * CHAR_BLOCK_H + (ROWS - 1) * ROW_GAP_Y;

function getGlyphRows(code: number, cgram: number[][]): number[] {
  if (code >= 0 && code <= 7) return cgram[code] ?? HD44780_FONT_FALLBACK;
  return HD44780_FONT[code] ?? HD44780_FONT_FALLBACK;
}

export function Lcd20x4I2CPart({ part, selected, pinStates, netlist, onPinClick }: Lcd20x4I2CPartProps) {
  const def = partDefinitions["lcd-20x4-i2c"];
  const powered = netlist?.isPowered(part.id) ?? false;

  const screen = useCircuitStore((s) => s.lcdScreens[part.id]);
  const cells = screen?.cells ?? Array.from({ length: ROWS }, () => Array(COLS).fill(0x20));
  const cgram = screen?.cgram ?? Array.from({ length: 8 }, () => Array(8).fill(0));
  const backlightOn = screen ? screen.backlightOn : powered;

  const halfW = (def.widthUnits * GRID) / 2;
  const halfH = (def.heightUnits * GRID) / 2;
  const headerEdgeX = -halfW;

  const holeRadius = 4;
  const holeInset = 10;
  const cornerHoles = [
    { x: -halfW + holeInset, y: -halfH + holeInset },
    { x: halfW - holeInset, y: -halfH + holeInset },
    { x: -halfW + holeInset, y: halfH - holeInset },
    { x: halfW - holeInset, y: halfH - holeInset },
  ];

  const outerBezelX = -halfW + 17;
  const outerBezelY = -halfH + 18;
  const outerBezelW = halfW * 2 - 36;
  const outerBezelH = halfH * 2 - 28;

  const screenLeft = outerBezelX + 10;
  const screenTop = outerBezelY + 8;
  const screenWidth = outerBezelW - 20;
  const screenHeight = outerBezelH - 16;

  const contentLeft = screenLeft + (screenWidth - CONTENT_WIDTH) / 2;
  const contentTop = screenTop + (screenHeight - CONTENT_HEIGHT) / 2;

  const litColor = "#dbeafe";
  const dimColor = backlightOn ? "#2c4a8f" : "#1e293b";

  const maskId = `pcb-holes-mask-${part.id}`;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <defs>
        <mask id={maskId}>
          <rect x={-halfW} y={-halfH} width={halfW * 2 + 10} height={halfH * 2 + 10} fill="#ffffff" />
          {cornerHoles.map((hole, idx) => (
            <circle key={idx} cx={hole.x} cy={hole.y} r={holeRadius} fill="#000000" />
          ))}
        </mask>
      </defs>
          
      <rect
        x={-halfW}
        y={-halfH + 2}
        width={halfW * 2}
        height={halfH * 2}
        rx={8}
        fill="#1a7a3c"
        stroke={selected ? "#4da3ff" : "#14592b"}
        strokeWidth={selected ? 2.5 : 1.5}
        mask={`url(#${maskId})`}
      />

      {cornerHoles.map((hole, idx) => (
        <circle key={idx} cx={hole.x} cy={hole.y} r={holeRadius + 1.2} fill="none" stroke="#d4af37" strokeWidth={1} opacity={0.7} />
      ))}

      <g>
        {Array.from({ length: 16 }).map((_, i) => {
          const padX = -halfW + 24 + i * 11.5;
          const padY = -halfH + 8;
          return (
            <g key={i}>
              <circle cx={padX + 2} cy={padY} r={3.0} fill="#d1d5db" stroke="#9ca3af" strokeWidth={0.6} />
              <circle cx={padX + 2} cy={padY} r={1.5} fill="#4b5563" />
            </g>
          );
        })}
      </g>

      {/* Outer Bezel */}
      <rect x={outerBezelX + 1} y={outerBezelY + 1} width={outerBezelW - 2} height={outerBezelH - 2} rx={2} fill="#000000" />

      {/* Lcd Screen */}
      <rect x={screenLeft} y={screenTop} width={screenWidth} height={screenHeight} rx={2} fill={backlightOn ? "#1e3a8a" : "#0f172a"} />

      {backlightOn && (
        <rect x={screenLeft} y={screenTop} width={screenWidth} height={screenHeight} rx={2} fill="#3b82f6" opacity={0.15} />
      )}

      {/* 20x4 character matrix*/}
      <g style={{ pointerEvents: "none" }}>
        {cells.map((rowCells, row) =>
          rowCells.map((code, col) => {
            const glyphRows = getGlyphRows(code, cgram);
            const cellX = contentLeft + col * (CHAR_BLOCK_W + CHAR_GAP_X);
            const cellY = contentTop + row * (CHAR_BLOCK_H + ROW_GAP_Y);

            return (
              <g key={`${row}-${col}`}>
                {glyphRows.map((rowValue, r) =>
                  Array.from({ length: DOTS_W }).map((_, c) => {
                    const lit = backlightOn && ((rowValue >> (DOTS_W - 1 - c)) & 1) === 1;
                    return (
                      <rect
                        key={c}
                        x={cellX + c * DOT_PITCH}
                        y={cellY + r * DOT_PITCH}
                        width={DOT_SIZE}
                        height={DOT_SIZE}
                        rx={0}
                        fill={lit ? litColor : dimColor}
                      />
                    );
                  })
                )}
              </g>
            );
          })
        )}
      </g>

      <rect x={headerEdgeX - 7} y={-halfH + 24} width={7} height={42} fill="#1c1c1c" rx={1} />
        
      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLabel x={headerEdgeX + 6} y={pin.y * GRID + 2} color="#eafff2" textAnchor="start" text={pin.label} />
          <PinLeg x1={headerEdgeX} y1={pin.y * GRID} x2={pin.x * GRID} y2={pin.y * GRID} />
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