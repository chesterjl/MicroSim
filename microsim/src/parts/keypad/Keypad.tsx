import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import { partDefinitions } from "../../config/partDefinitions";
import { useCircuitStore } from "../../store/circuitStore";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLabel } from "../../components/parts/pin/PinLabel";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import type { NetState } from "../../engine/netlist";

const KEY_LABELS = [
  ["1", "2", "3", "A"],
  ["4", "5", "6", "B"],
  ["7", "8", "9", "C"],
  ["*", "0", "#", "D"],
];

function isRedKey(r: number, c: number) {
  return c === 3 || (r === 3 && (c === 0 || c === 2));
}

interface KeypadPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function KeypadPart({ part, selected, pinStates, onPinClick}: KeypadPartProps) {
  const def = partDefinitions["keypad-4x4"];
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);

  const pressedRow = part.properties?.pressedRow as number | null;
  const pressedCol = part.properties?.pressedCol as number | null;

  const bodyHalfW = 7 * GRID;
  const bodyTop = -7 * GRID;
  const bodyBottom = 7 * GRID;

  const gridTop = bodyTop + 15;
  const cell = 22;
  const gap = 6;
  const gridWidth = 4 * cell + 3 * gap;
  const gridLeft = -gridWidth / 2;

  function pressKey(r: number, c: number, e: React.MouseEvent) {
    e.stopPropagation();
    updatePartProperties(part.id, { pressedRow: r, pressedCol: c });
  }

  function releaseKey() {
    updatePartProperties(part.id, { pressedRow: null, pressedCol: null });
  }

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Housing */}
      <rect
        x={-bodyHalfW}
        y={bodyTop}
        width={bodyHalfW * 2}
        height={bodyBottom - bodyTop}
        rx={10}
        fill="#3a3a3e"
        stroke={selected ? "#4da3ff" : "#1c1c1f"}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      <rect
        x={-bodyHalfW + 6}
        y={bodyTop + 6}
        width={bodyHalfW * 2 - 12}
        height={bodyBottom - bodyTop - 12}
        rx={7}
        fill="none"
        stroke="#8f8f96"
        strokeWidth={1.5}
      />

      {/* 4x4 button grid */}
      {KEY_LABELS.map((row, r) =>
        row.map((label, c) => {
          const x = gridLeft + c * (cell + gap);
          const y = gridTop + r * (cell + gap);
          const isDown = pressedRow === r && pressedCol === c;
          const red = isRedKey(r, c);

          return (
            <g
              key={`${r}-${c}`}
              style={{ cursor: "pointer" }}
              onMouseDown={(e) => pressKey(r, c, e)}
              onMouseUp={(e) => {
                e.stopPropagation();
                releaseKey();
              }}
              onMouseLeave={() => {
                if (isDown) releaseKey();
              }}
            >
              <rect
                x={x}
                y={y + (isDown ? 1.5 : 0)}
                width={cell}
                height={cell}
                rx={4}
                fill={red ? (isDown ? "#b91c1c" : "#dc4b4b") : isDown ? "#1d4ed8" : "#5b8fd6"}
                stroke="#9ca3af"
                strokeWidth={1}
              />
              <text
                x={x + cell / 2}
                y={y + cell / 2 + (isDown ? 1.5 : 0) + 4}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="#f3f4f6"
                fontFamily="sans-serif"
                pointerEvents="none"
              >
                {label}
              </text>
            </g>
          );
        })
      )}

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLabel x={pin.x * GRID} y={pin.y * GRID - 30} color="#a1a1aa" fontSize={6} text={pin.label}/>
          <PinLeg x1={pin.x * GRID} y1={bodyBottom} x2={pin.x * GRID} y2={pin.y * GRID}/>
          <Pin
            key={pin.id}
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