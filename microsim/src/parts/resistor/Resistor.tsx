import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { Netlist, NetState } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

const DIGIT_COLORS: Record<number, string> = {
  0: "#1a1a1a", 1: "#795548", 2: "#e53935", 3: "#ff9800", 4: "#fbc02d",
  5: "#4caf50", 6: "#1e88e5", 7: "#8e24aa", 8: "#757575", 9: "#ffffff",
};

const MULTIPLIER_COLORS: Record<number, string> = {
  "-2": "#c0c0c0", "-1": "#d4af37", 0: "#1a1a1a", 1: "#795548", 2: "#e53935",
  3: "#ff9800", 4: "#fbc02d", 5: "#4caf50", 6: "#1e88e5", 7: "#8e24aa",
};

const CHARRED_BODY = "#1a1108";
const CHARRED_STROKE = "#7f1d1d";

export function getResistorColorBands(ohms: number): [string, string, string, string] {
  if (ohms <= 0 || isNaN(ohms)) {
    return [DIGIT_COLORS[0], DIGIT_COLORS[0], DIGIT_COLORS[0], "#d4af37"];
  }
  let exp = Math.floor(Math.log10(ohms)) - 1;
  let normalized = ohms / Math.pow(10, exp);
  let sigDigits = Math.round(normalized);
  if (sigDigits >= 100) {
    sigDigits = 10;
    exp += 1;
  }
  const d1 = Math.floor(sigDigits / 10);
  const d2 = sigDigits % 10;
  const band1 = DIGIT_COLORS[d1] ?? DIGIT_COLORS[0];
  const band2 = DIGIT_COLORS[d2] ?? DIGIT_COLORS[0];
  const multiplier = MULTIPLIER_COLORS[exp] ?? "#888";
  return [band1, band2, multiplier, "#d4af37"];
}

export function formatResistance(ohms: number): string {
  if (ohms >= 1_000_000) return `${+(ohms / 1_000_000).toFixed(2)}M`;
  if (ohms >= 1_000) return `${+(ohms / 1_000).toFixed(2)}k`;
  return `${ohms}`;
}

interface ResistorPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function ResistorPart({ part, selected, pinStates, netlist, onPinClick }: ResistorPartProps) {
  const resistance = (part.properties?.resistance as number) ?? 220;
  const bands = getResistorColorBands(resistance);
  const def = partDefinitions.resistor;
  
  // hasFlag catches "overloaded right now"; part.properties.destroyed
  // catches "was overloaded at some point and hasn't been replaced" --
  // the persistent latch survives even after resolveVoltage stops
  // re-flagging it (which happens the instant destroyed becomes true,
  // since resolveVoltage short-circuits before calling setFlag again).
  // Checking only hasFlag here is what made the burst disappear the
  // very next frame after the resistor blew.
  const overloaded = (netlist?.hasFlag("resistorOverloaded", part.id) ?? false) || Boolean(part.properties?.destroyed);

  const reading = netlist?.getElectricalReading(part.id) ?? null;
  const tooltip = reading
    ? overloaded
      ? `Resistor -- OVERLOADED (exceeded rated wattage)`
      : `Resistor -- ${(reading.currentAmps * 1000).toFixed(1)}mA, ${formatResistance(resistance)}Ω`
    : undefined;

  const bodyWidth = 4 * GRID;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation || 0})`}>
      {tooltip && <title>{tooltip}</title>}

      <rect
        x={-2 * GRID}
        y={-0.8 * GRID}
        width={bodyWidth}
        height={1.6 * GRID}
        rx={4}
        fill={overloaded ? CHARRED_BODY : "#e8d4a0"}
        stroke={overloaded ? CHARRED_STROKE : selected ? "#4da3ff" : "#333"}
        strokeWidth={overloaded || selected ? 2 : 1}
      />

      {!overloaded && (
        <>
          <rect x={-1.3 * GRID} y={-0.8 * GRID} width={5} height={1.6 * GRID} fill={bands[0]} />
          <rect x={-0.7 * GRID} y={-0.8 * GRID} width={5} height={1.6 * GRID} fill={bands[1]} />
          <rect x={-0.1 * GRID} y={-0.8 * GRID} width={5} height={1.6 * GRID} fill={bands[2]} />
          <rect x={0.9 * GRID} y={-0.8 * GRID} width={5} height={1.6 * GRID} fill={bands[3]} />
        </>
      )}

      {overloaded && <OvercurrentBurst cx={0} cy={0} size={bodyWidth * 0.9} />}

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID < 0 ? -2 * GRID : 2 * GRID} y1={0} x2={pin.x * GRID} y2={pin.y * GRID} />
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