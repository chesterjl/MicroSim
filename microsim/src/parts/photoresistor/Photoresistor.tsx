import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { Netlist, NetState } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

const CHARRED_BODY = "#1a1108";
const CHARRED_STROKE = "#7f1d1d";

interface PhotoresistorPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function PhotoresistorPart({ part, selected, pinStates, netlist, onPinClick }: PhotoresistorPartProps) {
  const def = partDefinitions.photoresistor;
  const lightLevel = (part.properties?.lightLevel as number) ?? 0.5;

  // Same pattern as resistor/LED: hasFlag catches "overloaded right now",
  // destroyed catches "was overloaded and hasn't been replaced" -- need
  // both because resolveVoltage stops re-flagging the instant destroyed
  // becomes true.
  const overloaded = (netlist?.hasFlag("photoresistorOverloaded", part.id) ?? false) || Boolean(part.properties?.destroyed);

  const reading = netlist?.getElectricalReading(part.id) ?? null;
  const tooltip = reading
    ? overloaded
      ? "Photoresistor -- OVERLOADED (exceeded rated wattage)"
      : `Photoresistor -- ${(reading.currentAmps * 1000).toFixed(1)}mA`
    : undefined;

  const bodyRx = 1.6 * GRID;
  const bodyRy = 1.3 * GRID;

  const bodyFill = overloaded
    ? CHARRED_BODY
    : `rgb(${210 - lightLevel * 20}, ${200 - lightLevel * 10 + lightLevel * 30}, ${170 + lightLevel * 40})`;

  const trackX = bodyRx * 0.45;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {tooltip && <title>{tooltip}</title>}

      {/* Outer ceramic/orange ring */}
      <ellipse
        cx={0}
        cy={0}
        rx={bodyRx}
        ry={bodyRy}
        fill={overloaded ? CHARRED_BODY : "#c46a2e"}
        stroke={overloaded ? CHARRED_STROKE : selected ? "#4da3ff" : "#7a3d16"}
        strokeWidth={overloaded || selected ? 2.5 : 1.5}
      />

      {/* Cream/tan photosensitive face -- hidden once charred */}
      {!overloaded && <ellipse cx={0} cy={0} rx={bodyRx * 0.82} ry={bodyRy * 0.8} fill={bodyFill} />}

      {!overloaded && (
        <>
          <circle cx={-bodyRx * 0.55} cy={0} r={0.15 * GRID} fill="#b89368" opacity={0.6} />
          <circle cx={bodyRx * 0.55} cy={0} r={0.15 * GRID} fill="#b89368" opacity={0.6} />

          <path
            d={`
              M ${bodyRx * 0.48} ${bodyRy * 0.52}
              L ${-trackX} ${bodyRy * 0.52}
              A ${0.2 * GRID} ${0.2 * GRID} 0 0 1 ${-trackX} ${bodyRy * 0.22}
              L ${trackX} ${bodyRy * 0.22}
              A ${0.2 * GRID} ${0.2 * GRID} 0 0 0 ${trackX} ${-bodyRy * 0.08}
              L ${-trackX} ${-bodyRy * 0.08}
              A ${0.2 * GRID} ${0.2 * GRID} 0 0 1 ${-trackX} ${-bodyRy * 0.38}
              L ${trackX} ${-bodyRy * 0.38}
              A ${0.2 * GRID} ${0.2 * GRID} 0 0 0 ${trackX} ${-bodyRy * 0.68}
              L ${-bodyRx * 0.25} ${-bodyRy * 0.68}
            `}
            fill="none"
            stroke="#c46a2e"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {!overloaded && lightLevel > 0.6 && (
        <ellipse
          cx={0}
          cy={0}
          rx={bodyRx * 0.82}
          ry={bodyRy * 0.8}
          fill="#fff7cc"
          opacity={(lightLevel - 0.6) * 0.5}
          className="pointer-events-none"
        />
      )}

      {overloaded && <OvercurrentBurst cx={0} cy={0} size={bodyRx * 1.6} />}

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyRy * 0.7} x2={pin.x * GRID} y2={pin.y * GRID} />
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