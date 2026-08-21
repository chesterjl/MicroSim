import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";

// Digit color map (0 to 9)
const DIGIT_COLORS: Record<number, string> = {
  0: "#1a1a1a", // Black
  1: "#795548", // Brown
  2: "#e53935", // Red
  3: "#ff9800", // Orange
  4: "#fbc02d", // Yellow
  5: "#4caf50", // Green
  6: "#1e88e5", // Blue
  7: "#8e24aa", // Violet
  8: "#757575", // Grey
  9: "#ffffff", // White
};

// Multiplier color map based on power of 10 exponent (10^exp)
const MULTIPLIER_COLORS: Record<number, string> = {
  "-2": "#c0c0c0", // Silver (x0.01)
  "-1": "#d4af37", // Gold   (x0.1)
  0: "#1a1a1a",  // Black  (x1)
  1: "#795548",  // Brown  (x10)
  2: "#e53935",  // Red    (x100)
  3: "#ff9800",  // Orange (x1k)
  4: "#fbc02d",  // Yellow (x10k)
  5: "#4caf50",  // Green  (x100k)
  6: "#1e88e5",  // Blue   (x1M)
  7: "#8e24aa",  // Violet (x10M)
};

/**
 * Calculates 4-band resistor colors dynamically for ANY input resistance.
 * Returns [Band1 (Digit), Band2 (Digit), Band3 (Multiplier), Band4 (Tolerance)]
 */
export function getResistorColorBands(ohms: number): [string, string, string, string] {
  if (ohms <= 0 || isNaN(ohms)) {
    return [DIGIT_COLORS[0], DIGIT_COLORS[0], DIGIT_COLORS[0], "#d4af37"];
  }

  // Calculate exponent (power of 10) for two significant digits
  let exp = Math.floor(Math.log10(ohms)) - 1;
  let normalized = ohms / Math.pow(10, exp);
  let sigDigits = Math.round(normalized);

  // Handle rounding overflow (e.g. 99.6 -> 100)
  if (sigDigits >= 100) {
    sigDigits = 10;
    exp += 1;
  }

  const d1 = Math.floor(sigDigits / 10);
  const d2 = sigDigits % 10;

  const band1 = DIGIT_COLORS[d1] ?? DIGIT_COLORS[0];
  const band2 = DIGIT_COLORS[d2] ?? DIGIT_COLORS[0];
  const multiplier = MULTIPLIER_COLORS[exp] ?? "#888";
  const tolerance = "#d4af37"; // Gold 5% tolerance default

  return [band1, band2, multiplier, tolerance];
}

/**
 * Formats raw OHMs into readable string (e.g. 1000 -> "1k", 470000 -> "470k")
 */
export function formatResistance(ohms: number): string {
  if (ohms >= 1_000_000) return `${+(ohms / 1_000_000).toFixed(2)}M`;
  if (ohms >= 1_000) return `${+(ohms / 1_000).toFixed(2)}k`;
  return `${ohms}`;
}

export function ResistorPart({
  part,
  selected,
  pinStates,
  onPinClick,
}: {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}) {
  const resistance = (part.properties?.resistance as number) ?? 220;
  const bands = getResistorColorBands(resistance);
  const formattedText = formatResistance(resistance);
  const def = partDefinitions.resistor;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation || 0})`}>
      {/* Lead Wires */}
      <line x1={-3 * GRID} y1={0} x2={-2 * GRID} y2={0} stroke="#999" strokeWidth={2} />
      <line x1={2 * GRID} y1={0} x2={3 * GRID} y2={0} stroke="#999" strokeWidth={2} />

      {/* Resistor Body */}
      <rect
        x={-2 * GRID}
        y={-0.8 * GRID}
        width={4 * GRID}
        height={1.6 * GRID}
        rx={4}
        fill="#e8d4a0"
        stroke={selected ? "#4da3ff" : "#333"}
        strokeWidth={selected ? 2 : 1}
      />

      {/* Digit 1 Band */}
      <rect x={-1.3 * GRID} y={-0.8 * GRID} width={5} height={1.6 * GRID} fill={bands[0]} />

      {/* Digit 2 Band */}
      <rect x={-0.7 * GRID} y={-0.8 * GRID} width={5} height={1.6 * GRID} fill={bands[1]} />

      {/* Multiplier Band */}
      <rect x={-0.1 * GRID} y={-0.8 * GRID} width={5} height={1.6 * GRID} fill={bands[2]} />

      {/* Tolerance Band (Gold) */}
      <rect x={0.9 * GRID} y={-0.8 * GRID} width={5} height={1.6 * GRID} fill={bands[3]} />

      {/* Resistance Label directly above resistor */}
      <text
        x={0}
        y={-1.1 * GRID}
        textAnchor="middle"
        fill="#aaa"
        fontSize="11"
        fontWeight="600"
        className="select-none pointer-events-none"
      >
        {formattedText}Ω
      </text>

      {/* Connection Pins */}
      {def.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={pin.y * GRID}
          pinId={pin.id}
          label={`${pin.label} (${formattedText}Ω)`}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}