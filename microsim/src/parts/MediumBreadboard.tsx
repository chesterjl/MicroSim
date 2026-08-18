import type { BreadboardProps } from "../types/breadboard";
import { GRID } from "../types/types";
import { PinDot } from "./PinDot";

export function MediumBreadboardPart({
  part,
  selected,
  pinStates,
  onPinClick,
}: BreadboardProps) {
  const cols = 30;
  const colOffset = -Math.floor(cols / 2);
  const width = (cols + 4) * GRID;
  const height = 20 * GRID;

  const rowsTop = ["a", "b", "c", "d", "e"];
  const rowsBot = ["f", "g", "h", "i", "j"];

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation})`}>
      {/* Side Interlocking Puzzle Tabs */}
      <rect x={-width / 2 - 4} y={-16} width={4} height={32} rx={1} fill="#cbd5e1" />
      <rect x={width / 2} y={-16} width={4} height={32} rx={1} fill="#cbd5e1" />

      {/* Outer Plastic Casing */}
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={6}
        fill="#e2e8f0"
        stroke={selected ? "#0284c7" : "#cbd5e1"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Board Surface */}
      <rect
        x={-width / 2 + 3}
        y={-height / 2 + 3}
        width={width - 6}
        height={height - 6}
        rx={4}
        fill="#f8fafc"
      />

      {/* Power Rail Stripes (+ Red, - Blue) */}
      <line
        x1={-width / 2 + 18}
        y1={-8 * GRID}
        x2={width / 2 - 18}
        y2={-8 * GRID}
        stroke="#ef4444"
        strokeWidth={1.8}
      />
      <line
        x1={-width / 2 + 18}
        y1={-7 * GRID}
        x2={width / 2 - 18}
        y2={-7 * GRID}
        stroke="#3b82f6"
        strokeWidth={1.8}
      />

      <line
        x1={-width / 2 + 18}
        y1={7 * GRID}
        x2={width / 2 - 18}
        y2={7 * GRID}
        stroke="#ef4444"
        strokeWidth={1.8}
      />
      <line
        x1={-width / 2 + 18}
        y1={8 * GRID}
        x2={width / 2 - 18}
        y2={8 * GRID}
        stroke="#3b82f6"
        strokeWidth={1.8}
      />

      {/* Power Rail Margin Labels */}
      {/* Top Rails */}
      <text x={(colOffset - 1) * GRID} y={-8 * GRID + 2.5} fontSize="8" fill="#ef4444" textAnchor="middle" fontWeight="bold">+</text>
      <text x={(-colOffset + 1) * GRID} y={-8 * GRID + 2.5} fontSize="8" fill="#ef4444" textAnchor="middle" fontWeight="bold">+</text>
      <text x={(colOffset - 1) * GRID} y={-7 * GRID + 2.5} fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">−</text>
      <text x={(-colOffset + 1) * GRID} y={-7 * GRID + 2.5} fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">−</text>

      {/* Bottom Rails */}
      <text x={(colOffset - 1) * GRID} y={7 * GRID + 2.5} fontSize="8" fill="#ef4444" textAnchor="middle" fontWeight="bold">+</text>
      <text x={(-colOffset + 1) * GRID} y={7 * GRID + 2.5} fontSize="8" fill="#ef4444" textAnchor="middle" fontWeight="bold">+</text>
      <text x={(colOffset - 1) * GRID} y={8 * GRID + 2.5} fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">−</text>
      <text x={(-colOffset + 1) * GRID} y={8 * GRID + 2.5} fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">−</text>

      {/* Central DIP Trench */}
      <rect
        x={-width / 2 + 8}
        y={-GRID * 0.4}
        width={width - 16}
        height={GRID * 0.8}
        fill="#cbd5e1"
        rx={1}
      />

      {/* Row Silkscreen Labels */}
      {rowsTop.map((row, i) => (
        <g key={`row-top-${row}`}>
          <text x={(colOffset - 1) * GRID} y={(-5 + i + 0.25) * GRID} fontSize="7" fill="#64748b" textAnchor="middle" fontWeight="600">{row}</text>
          <text x={(-colOffset + 1) * GRID} y={(-5 + i + 0.25) * GRID} fontSize="7" fill="#64748b" textAnchor="middle" fontWeight="600">{row}</text>
        </g>
      ))}

      {rowsBot.map((row, i) => (
        <g key={`row-bot-${row}`}>
          <text x={(colOffset - 1) * GRID} y={(1 + i + 0.25) * GRID} fontSize="7" fill="#64748b" textAnchor="middle" fontWeight="600">{row}</text>
          <text x={(-colOffset + 1) * GRID} y={(1 + i + 0.25) * GRID} fontSize="7" fill="#64748b" textAnchor="middle" fontWeight="600">{row}</text>
        </g>
      ))}

      {/* Pins and Column Labels */}
      {Array.from({ length: cols }).map((_, c) => {
        const colNum = c + 1;
        const x = (colOffset + c) * GRID;

        return (
          <g key={c}>
            {/* Top Power Rail */}
            <PinDot x={x} y={-8 * GRID} pinId={`pwr_top_plus_${colNum}`} label={`+${colNum}`} state={pinStates?.[`pwr_top_plus_${colNum}`]} onClick={(e) => onPinClick?.(`pwr_top_plus_${colNum}`, e)} />
            <PinDot x={x} y={-7 * GRID} pinId={`pwr_top_minus_${colNum}`} label={`-${colNum}`} state={pinStates?.[`pwr_top_minus_${colNum}`]} onClick={(e) => onPinClick?.(`pwr_top_minus_${colNum}`, e)} />

            {/* Column Numbers */}
            {(colNum === 1 || colNum % 5 === 0 || colNum === cols) && (
              <text x={x} y={-5.8 * GRID} fontSize="7" fill="#64748b" textAnchor="middle" fontWeight="bold">
                {colNum}
              </text>
            )}

            {/* Rows A-E */}
            {rowsTop.map((row, i) => {
              const pinId = `col_${colNum}_${row}`;
              return (
                <PinDot key={pinId} x={x} y={(-5 + i) * GRID} pinId={pinId} label={`${colNum}${row.toUpperCase()}`} state={pinStates?.[pinId]} onClick={(e) => onPinClick?.(pinId, e)} />
              );
            })}

            {/* Rows F-J */}
            {rowsBot.map((row, i) => {
              const pinId = `col_${colNum}_${row}`;
              return (
                <PinDot key={pinId} x={x} y={(1 + i) * GRID} pinId={pinId} label={`${colNum}${row.toUpperCase()}`} state={pinStates?.[pinId]} onClick={(e) => onPinClick?.(pinId, e)} />
              );
            })}

            {/* Bottom Power Rail */}
            <PinDot x={x} y={7 * GRID} pinId={`pwr_bot_plus_${colNum}`} label={`+${colNum}`} state={pinStates?.[`pwr_bot_plus_${colNum}`]} onClick={(e) => onPinClick?.(`pwr_bot_plus_${colNum}`, e)} />
            <PinDot x={x} y={8 * GRID} pinId={`pwr_bot_minus_${colNum}`} label={`-${colNum}`} state={pinStates?.[`pwr_bot_minus_${colNum}`]} onClick={(e) => onPinClick?.(`pwr_bot_minus_${colNum}`, e)} />
          </g>
        );
      })}
    </g>
  );
}