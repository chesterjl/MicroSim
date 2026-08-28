import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import { useCircuitStore } from "../store/circuitStore";

interface RemoteButton {
  key: string;
  label: string;
  x: number;
  y: number;
  variant: "power" | "outline" | "dark";
}

const BUTTONS: RemoteButton[] = [
  { key: "power", label: "⏻", x: -3, y: -12, variant: "power" },
  { key: "menu", label: "MENU", x: 3, y: -12, variant: "outline" },

  { key: "test", label: "TEST", x: -3, y: -9, variant: "outline" },
  { key: "plus", label: "+", x: 0, y: -9, variant: "dark" },
  { key: "back", label: "↺", x: 3, y: -9, variant: "dark" },

  { key: "prev", label: "⏮", x: -3, y: -6, variant: "dark" },
  { key: "play", label: "▶", x: 0, y: -6, variant: "dark" },
  { key: "next", label: "⏭", x: 3, y: -6, variant: "dark" },

  { key: "zero", label: "0", x: -3, y: -3, variant: "outline" },
  { key: "minus", label: "−", x: 0, y: -3, variant: "dark" },
  { key: "c", label: "C", x: 3, y: -3, variant: "outline" },

  { key: "one", label: "1", x: -3, y: 0, variant: "outline" },
  { key: "two", label: "2", x: 0, y: 0, variant: "outline" },
  { key: "three", label: "3", x: 3, y: 0, variant: "outline" },

  { key: "four", label: "4", x: -3, y: 3, variant: "outline" },
  { key: "five", label: "5", x: 0, y: 3, variant: "outline" },
  { key: "six", label: "6", x: 3, y: 3, variant: "outline" },

  { key: "seven", label: "7", x: -3, y: 6, variant: "outline" },
  { key: "eight", label: "8", x: 0, y: 6, variant: "outline" },
  { key: "nine", label: "9", x: 3, y: 6, variant: "outline" },
];

const BUTTON_RADIUS = 1.35 * GRID;

export function IrRemotePart({ part, selected }: { part: PartInstance; selected: boolean }) {
  const pressIrButton = useCircuitStore((s) => s.pressIrButton);
  const lastButton = part.properties?.lastButton as string | null;

  const bodyHalfW = 5 * GRID;
  const bodyTop = -15 * GRID;
  const bodyBottom = 8 * GRID;

  function fillFor(variant: RemoteButton["variant"], active: boolean) {
    if (variant === "power") return active ? "#f87171" : "#dc2626";
    if (variant === "dark") return active ? "#3f3f46" : "#18181b";
    return active ? "#e4e4e7" : "#ffffff";
  }

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <rect
        x={-bodyHalfW}
        y={bodyTop}
        width={bodyHalfW * 2}
        height={bodyBottom - bodyTop}
        rx={18}
        fill="#fafafa"
        stroke={selected ? "#4da3ff" : "#d4d4d8"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {BUTTONS.map((btn) => {
        const cx = btn.x * GRID;
        const cy = btn.y * GRID;
        const active = lastButton === btn.key;
        const isNumber = /^[0-9]$/.test(btn.label);

        return (
          <g
            key={btn.key}
            style={{ cursor: "pointer" }}
            onMouseDown={(e) => {
              e.stopPropagation();
              pressIrButton(part.id, btn.key);
            }}
          >
            <circle
              cx={cx}
              cy={cy}
              r={BUTTON_RADIUS}
              fill={fillFor(btn.variant, active)}
              stroke={btn.variant === "outline" ? "#3f3f46" : "#000000"}
              strokeWidth={1.5}
            />
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fontSize={btn.label.length > 1 && !isNumber ? 8 : 12}
              fontWeight={700}
              fill={isNumber ? "#18181b" : btn.variant === "outline" ? "#dc2626" : "#ffffff"}
              fontFamily="sans-serif"
              pointerEvents="none"
            >
              {btn.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}