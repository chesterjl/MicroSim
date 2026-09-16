import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { Netlist, NetState } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

const CHARRED_BODY = "#1a1108";
const CHARRED_STROKE = "#7f1d1d";

interface PotentiometerPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function PotentiometerPart({ part, selected, pinStates, netlist, onPinClick }: PotentiometerPartProps) {
  const def = partDefinitions.potentiometer;
  const maxResistance = (part.properties?.maxResistance as number) ?? 10000;
  const wiperPosition = (part.properties?.wiperPosition as number) ?? 0.5;
  const angle = -135 + wiperPosition * 270;

  const overloaded = (netlist?.hasFlag("potentiometerOverloaded", part.id) ?? false) || Boolean(part.properties?.destroyed);

  const reading = netlist?.getElectricalReading(part.id) ?? null;
  const formatOhms = (ohms: number) => (ohms >= 1000 ? `${+(ohms / 1000).toFixed(1)}k` : `${ohms}`);
  const tooltip = overloaded
    ? "Potentiometer -- OVERLOADED (exceeded rated wattage)"
    : reading
    ? `Potentiometer -- ${(reading.currentAmps * 1000).toFixed(1)}mA, ${formatOhms(maxResistance)}Ω max`
    : undefined;

  const bodyHalfW = 3 * GRID;
  const bodyTop = -3 * GRID;
  const bodyBottom = 2 * GRID;
  const knobCx = 0;
  const knobCy = -0.5 * GRID;
  const knobR = 2.2 * GRID;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {tooltip && <title>{tooltip}</title>}

      {/* Body */}
      <rect
        x={-bodyHalfW}
        y={bodyTop}
        width={bodyHalfW * 2}
        height={bodyBottom - bodyTop}
        rx={4}
        fill={overloaded ? CHARRED_BODY : "#e4e4e7"}
        stroke={overloaded ? CHARRED_STROKE : selected ? "#4da3ff" : "#a1a1aa"}
        strokeWidth={overloaded || selected ? 2 : 1.5}
      />

      {!overloaded && (
        <>
          {/* Rotating knob */}
          <circle cx={knobCx} cy={knobCy} r={knobR} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.5} />
          <circle cx={knobCx} cy={knobCy} r={knobR * 0.55} fill="#3b82f6" opacity={0.6} />
          <line
            x1={knobCx}
            y1={knobCy}
            x2={knobCx}
            y2={knobCy - knobR * 0.85}
            stroke="#dbeafe"
            strokeWidth={3}
            strokeLinecap="round"
            transform={`rotate(${angle} ${knobCx} ${knobCy})`}
          />

          <text x={0} y={bodyTop - 6} textAnchor="middle" fontSize={9} fontWeight={700} fill="#a1a1aa" fontFamily="monospace">
            {formatOhms(maxResistance)}Ω
          </text>
        </>
      )}

      {overloaded && <OvercurrentBurst cx={knobCx} cy={knobCy} size={knobR * 1.6} />}

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyBottom} x2={pin.x * GRID} y2={pin.y * GRID} />
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