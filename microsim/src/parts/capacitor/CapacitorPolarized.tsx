import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

interface CapacitorPolarizedPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

const CHARRED_BODY = "#1a1108";
const CHARRED_STROKE = "#7f1d1d";

export function CapacitorPolarizedPart({ part, selected, pinStates, netlist, onPinClick }: CapacitorPolarizedPartProps) {
  const def = partDefinitions["capacitor-polarized"];

  const voltageRating = (part.properties?.voltageRating as number) ?? 16;
  const storedVoltage = (part.properties?.storedVoltage as number) ?? 0;

  const reversed = netlist?.hasFlag("capacitorReversed", part.id) ?? false;
  const overloaded = netlist?.hasFlag("capacitorOverloaded", part.id) ?? false;
  const damaged = reversed || overloaded;

  const tooltip = damaged
    ? reversed
      ? `Electrolytic Capacitor -- VENTED (reverse voltage: ${storedVoltage.toFixed(2)}V)`
      : `Electrolytic Capacitor -- VENTED (${storedVoltage.toFixed(2)}V exceeded ${voltageRating}V rating)`
    : `Electrolytic Capacitor -- ${storedVoltage.toFixed(2)}V / ${voltageRating}V rated`;

  const chargeRatio = damaged
    ? 0
    : voltageRating > 0
    ? Math.max(0, Math.min(1, storedVoltage / voltageRating))
    : 0;

  const bodyHalfW = 2 * GRID;
  const bodyTop = -3.5 * GRID;
  const bodyBottom = 1.5 * GRID;
  const fillTrackH = bodyBottom - bodyTop - 6;

  const bodyFill = damaged ? CHARRED_BODY : "#2b2b2e";
  const bodyStroke = damaged ? CHARRED_STROKE : selected ? "#4da3ff" : "#111";

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>{tooltip}</title>

      {/* Electrolytic can body */}
      <rect
        x={-bodyHalfW}
        y={bodyTop}
        width={bodyHalfW * 2}
        height={bodyBottom - bodyTop}
        rx={6}
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth={damaged ? 2 : selected ? 2.5 : 1.5}
      />

      {!damaged && (
        <>
          {/* Negative-side stripe */}
          <rect
            x={0.4 * GRID}
            y={bodyTop + 2}
            width={bodyHalfW - 0.4 * GRID - 2}
            height={bodyBottom - bodyTop - 4}
            fill="#171717"
          />
          {[0, 1, 2].map((i) => (
            <text
              key={i}
              x={0.4 * GRID + (bodyHalfW - 0.4 * GRID - 2) / 2}
              y={bodyTop + 10 + i * 8}
              textAnchor="middle"
              fontSize={7}
              fontWeight={700}
              fill="#e5e5e5"
            >
              −
            </text>
          ))}

          {/* Charge-level fill */}
          {chargeRatio > 0 && (
            <rect
              x={-bodyHalfW + 3}
              y={bodyBottom - 3 - fillTrackH * chargeRatio}
              width={bodyHalfW - 0.4 * GRID - 5}
              height={fillTrackH * chargeRatio}
              fill="#22c55e"
              opacity={0.55}
            />
          )}

          {/* Vent score mark on top */}
          <path
            d={`M 0 ${bodyTop + 2} L 0 ${bodyTop + 8} M -5 ${bodyTop + 5} L 5 ${bodyTop + 5}`}
            stroke="#4b5563"
            strokeWidth={1}
          />
        </>
      )}

      {damaged && <OvercurrentBurst cx={0} cy={bodyTop + 6} size={bodyHalfW * 2.4} />}

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyBottom} x2={pin.x * GRID} y2={pin.y * GRID} />
          <Pin
            x={pin.x * GRID}
            y={pin.y * GRID}
            pinId={pin.id}
            label={damaged ? `${pin.label} — vented` : `${pin.label} — ${storedVoltage.toFixed(2)}V stored`}
            state={pinStates?.[pin.id]}
            onClick={(e) => onPinClick?.(pin.id, e)}
          />
        </g>
      ))}
    </g>
  );
}