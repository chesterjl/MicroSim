import type { BreadboardProps } from "../types/breadboard";
import { GRID } from "../types/types";
import { PinDot } from "./PinDot";

export function SmallBreadboardPart({
  part,
  selected,
  pinStates,
  onPinClick,
}: BreadboardProps) {
  const cols = 17;
  const colOffset = -Math.floor(cols / 2);
  const width = (cols + 3) * GRID;
  const height = 14 * GRID;

  const rowsTop = ["a", "b", "c", "d", "e"];
  const rowsBot = ["f", "g", "h", "i", "j"];

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation})`}>
      {/* Outer Casing */}
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

      {/* Main Board Surface */}
      <rect
        x={-width / 2 + 3}
        y={-height / 2 + 3}
        width={width - 6}
        height={height - 6}
        rx={4}
        fill="#f8fafc"
      />

      {/* Center Divider Trench */}
      <rect
        x={-width / 2 + 6}
        y={-GRID * 0.4}
        width={width - 12}
        height={GRID * 0.8}
        fill="#cbd5e1"
        rx={1}
      />

      {/* Row Labels (Left & Right Margins) */}
      {rowsTop.map((row, i) => (
        <g key={`row-label-top-${row}`}>
          <text
            x={(colOffset - 0.9) * GRID}
            y={(-5 + i + 0.25) * GRID}
            fontSize="7"
            fill="#64748b"
            textAnchor="middle"
            fontWeight="600"
          >
            {row}
          </text>
          <text
            x={(-colOffset + 0.9) * GRID}
            y={(-5 + i + 0.25) * GRID}
            fontSize="7"
            fill="#64748b"
            textAnchor="middle"
            fontWeight="600"
          >
            {row}
          </text>
        </g>
      ))}

      {rowsBot.map((row, i) => (
        <g key={`row-label-bot-${row}`}>
          <text
            x={(colOffset - 0.9) * GRID}
            y={(1 + i + 0.25) * GRID}
            fontSize="7"
            fill="#64748b"
            textAnchor="middle"
            fontWeight="600"
          >
            {row}
          </text>
          <text
            x={(-colOffset + 0.9) * GRID}
            y={(1 + i + 0.25) * GRID}
            fontSize="7"
            fill="#64748b"
            textAnchor="middle"
            fontWeight="600"
          >
            {row}
          </text>
        </g>
      ))}

      {/* Pins and Column Labels */}
      {Array.from({ length: cols }).map((_, c) => {
        const colNum = c + 1;
        const x = (colOffset + c) * GRID;

        return (
          <g key={c}>
            {/* Column Number Markings */}
            {(colNum === 1 || colNum % 5 === 0 || colNum === cols) && (
              <text
                x={x}
                y={-5.8 * GRID}
                fontSize="7"
                fill="#64748b"
                textAnchor="middle"
                fontWeight="bold"
              >
                {colNum}
              </text>
            )}

            {/* Rows A-E */}
            {rowsTop.map((row, i) => {
              const pinId = `col_${colNum}_${row}`;
              return (
                <PinDot
                  key={pinId}
                  x={x}
                  y={(-5 + i) * GRID}
                  pinId={pinId}
                  label={`${colNum}${row.toUpperCase()}`}
                  state={pinStates?.[pinId]}
                  onClick={(e) => onPinClick?.(pinId, e)}
                />
              );
            })}

            {/* Rows F-J */}
            {rowsBot.map((row, i) => {
              const pinId = `col_${colNum}_${row}`;
              return (
                <PinDot
                  key={pinId}
                  x={x}
                  y={(1 + i) * GRID}
                  pinId={pinId}
                  label={`${colNum}${row.toUpperCase()}`}
                  state={pinStates?.[pinId]}
                  onClick={(e) => onPinClick?.(pinId, e)}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}