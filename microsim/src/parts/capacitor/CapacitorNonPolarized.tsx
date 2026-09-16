import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

interface CapacitorNonPolarizedPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

const CHARRED_BODY = "#1a1108";
const CHARRED_STROKE = "#7f1d1d";

export function CapacitorNonPolarizedPart({ part, selected, pinStates, netlist, onPinClick }: CapacitorNonPolarizedPartProps) {
  const def = partDefinitions["capacitor-nonpolarized"];
  const capacitanceValue = (part.properties?.capacitanceValue as number) ?? 100;
  const capacitanceUnit = (part.properties?.capacitanceUnit as string) ?? "nF";
  const voltageRating = (part.properties?.voltageRating as number) ?? 50;
  const storedVoltage = (part.properties?.storedVoltage as number) ?? 0;

  // No reverse-polarity fault for a ceramic disc -- only overvoltage.
  const overloaded = netlist?.hasFlag("capacitorOverloaded", part.id) ?? false;

  const tooltip = overloaded
    ? `Ceramic Capacitor -- VENTED (${storedVoltage.toFixed(2)}V exceeded ${voltageRating}V rating)`
    : `Ceramic Capacitor -- ${storedVoltage.toFixed(2)}V / ${voltageRating}V rated`;

  const bodyTop = -2 * GRID;
  const bodyBottom = 1.5 * GRID;
  const cy = (bodyTop + bodyBottom) / 2;
  const ry = (bodyBottom - bodyTop) / 2;

  const bodyFill = overloaded ? CHARRED_BODY : "#f4c542";
  const bodyStroke = overloaded ? CHARRED_STROKE : selected ? "#4da3ff" : "#8a6d1a";

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>{tooltip}</title>

      {/* Ceramic disc body */}
      <ellipse
        cx={0}
        cy={cy}
        rx={2 * GRID}
        ry={ry}
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth={overloaded ? 2 : selected ? 2.5 : 1.5}
      />

      {!overloaded && (
        <>
          {/* Charge-level indicator */}
          {storedVoltage > 0.05 && (
            <ellipse
              cx={0}
              cy={cy}
              rx={2 * GRID - 3}
              ry={ry - 3}
              fill="none"
              stroke="#22c55e"
              strokeWidth={1.5}
              opacity={Math.min(1, storedVoltage / 5)}
            />
          )}

          {/* Silkscreen Value */}
          <text x={0} y={cy + 3} textAnchor="middle" fontSize={7} fontWeight={700} fill="#4b3b0a">
            {capacitanceValue}{capacitanceUnit}
          </text>
        </>
      )}

      {overloaded && <OvercurrentBurst cx={0} cy={cy} size={ry * 3} />}

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={cy} x2={pin.x * GRID} y2={pin.y * GRID} />
          <Pin
            x={pin.x * GRID}
            y={pin.y * GRID}
            pinId={pin.id}
            label={overloaded ? `${pin.label} — vented` : `${pin.label} — ${storedVoltage.toFixed(2)}V stored`}
            state={pinStates?.[pin.id]}
            onClick={(e) => onPinClick?.(pin.id, e)}
          />
        </g>
      ))}
    </g>
  );
}