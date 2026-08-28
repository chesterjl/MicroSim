import type { BreadboardProps } from "../types/breadboard";
import { GRID } from "../types/types";
import { PinDot } from "./PinDot";

export function LargeBreadboardPart({part, selected, pinStates, onPinClick}: BreadboardProps) {
  const cols = 63;
  const colOffset = -Math.floor(cols / 2);
  const width = (cols + 4) * GRID;
  const height = 22 * GRID;

  const rowsTop = ["a", "b", "c", "d", "e"];
  const rowsBot = ["f", "g", "h", "i", "j"];

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation})`}>
      {/* Aluminum / Metal Backing Plate */}
      <rect
        x={-width / 2 - 8}
        y={-height / 2 - 6}
        width={width + 16}
        height={height + 12}
        rx={8}
        fill="#334155"
        stroke={selected ? "#0284c7" : "#1e293b"}
        strokeWidth={2}
      />

      {/* Screw Mounting Holes on Metallic Plate */}
      <circle cx={-width / 2 - 2} cy={0} r={4} fill="#0f172a" />
      <circle cx={width / 2 + 2} cy={0} r={4} fill="#0f172a" />

      {/* Main Breadboard Plastic Chassis */}
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={5}
        fill="#e2e8f0"
      />

      {/* Board Surface */}
      <rect
        x={-width / 2 + 3}
        y={-height / 2 + 3}
        width={width - 6}
        height={height - 6}
        rx={3}
        fill="#f8fafc"
      />

      {/* Power Rail Stripes (+ Red, - Blue) */}
      <line x1={-width / 2 + 18} y1={-8 * GRID} x2={width / 2 - 18} y2={-8 * GRID} stroke="#ef4444" strokeWidth={1.8} />
      <line x1={-width / 2 + 18} y1={-7 * GRID} x2={width / 2 - 18} y2={-7 * GRID} stroke="#3b82f6" strokeWidth={1.8} />

      <line x1={-width / 2 + 18} y1={7 * GRID} x2={width / 2 - 18} y2={7 * GRID} stroke="#ef4444" strokeWidth={1.8} />
      <line x1={-width / 2 + 18} y1={8 * GRID} x2={width / 2 - 18} y2={8 * GRID} stroke="#3b82f6" strokeWidth={1.8} />

      {/* Power Rail Labels */}
      <text x={(colOffset - 1) * GRID} y={-8 * GRID + 2.5} fontSize="8" fill="#ef4444" textAnchor="middle" fontWeight="bold">+</text>
      <text x={(-colOffset + 1) * GRID} y={-8 * GRID + 2.5} fontSize="8" fill="#ef4444" textAnchor="middle" fontWeight="bold">+</text>
      <text x={(colOffset - 1) * GRID} y={-7 * GRID + 2.5} fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">−</text>
      <text x={(-colOffset + 1) * GRID} y={-7 * GRID + 2.5} fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">−</text>

      <text x={(colOffset - 1) * GRID} y={7 * GRID + 2.5} fontSize="8" fill="#ef4444" textAnchor="middle" fontWeight="bold">+</text>
      <text x={(-colOffset + 1) * GRID} y={7 * GRID + 2.5} fontSize="8" fill="#ef4444" textAnchor="middle" fontWeight="bold">+</text>
      <text x={(colOffset - 1) * GRID} y={8 * GRID + 2.5} fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">−</text>
      <text x={(-colOffset + 1) * GRID} y={8 * GRID + 2.5} fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">−</text>

      {/* Center Divider Trench */}
      <rect
        x={-width / 2 + 8}
        y={-GRID * 0.4}
        width={width - 16}
        height={GRID * 0.8}
        fill="#cbd5e1"
        rx={1}
      />

      {/* Row Silkscreen Markings */}
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

      {/* Pins Grid & Column Numbers */}
      {Array.from({ length: cols }).map((_, c) => {
        const colNum = c + 1;
        const x = (colOffset + c) * GRID;

        return (
          <g key={c}>
            {/* Power Rail Top */}
            <PinDot x={x} y={-8 * GRID} pinId={`pwr_top_plus_${colNum}`} label={`+${colNum}`} state={pinStates?.[`pwr_top_plus_${colNum}`]} onClick={(e) => onPinClick?.(`pwr_top_plus_${colNum}`, e)} />
            <PinDot x={x} y={-7 * GRID} pinId={`pwr_top_minus_${colNum}`} label={`-${colNum}`} state={pinStates?.[`pwr_top_minus_${colNum}`]} onClick={(e) => onPinClick?.(`pwr_top_minus_${colNum}`, e)} />

            {/* Column Numbers every 5 columns */}
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

            {/* Power Rail Bottom */}
            <PinDot x={x} y={7 * GRID} pinId={`pwr_bot_plus_${colNum}`} label={`+${colNum}`} state={pinStates?.[`pwr_bot_plus_${colNum}`]} onClick={(e) => onPinClick?.(`pwr_bot_plus_${colNum}`, e)} />
            <PinDot x={x} y={8 * GRID} pinId={`pwr_bot_minus_${colNum}`} label={`-${colNum}`} state={pinStates?.[`pwr_bot_minus_${colNum}`]} onClick={(e) => onPinClick?.(`pwr_bot_minus_${colNum}`, e)} />
          </g>
        );
      })}
    </g>
  );
}