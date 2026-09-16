import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

interface ActiveBuzzerPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function ActiveBuzzerPart({ part, selected, pinStates, netlist, onPinClick }: ActiveBuzzerPartProps) {
  const def = partDefinitions["active-buzzer"];
  const bodyRadius = 4 * GRID;
  const pinY = 5 * GRID;

  const overloaded = netlist?.hasFlag("buzzerOverloaded", part.id) ?? false;
  const reversed = netlist?.hasFlag("buzzerReversed", part.id) ?? false;
  const sounding = netlist?.hasFlag("activeBuzzerSounding", part.id) ?? false;
  
  const reading = netlist?.getElectricalReading(part.id) ?? null;

  const tooltip = reading
    ? overloaded
      ? `Active Buzzer -- BURNED OUT (${(reading.currentAmps * 1000).toFixed(1)}mA exceeded rated max)`
      : `Active Buzzer -- ${(reading.currentAmps * 1000).toFixed(1)}mA @ ${reading.loopVoltage.toFixed(2)}V${
          reversed ? " (reversed!)" : ""
        }${sounding ? " (sounding)" : ""}`
    : undefined;

  const bodyFill = overloaded ? "#1a1108" : "#18181B";
  const bodyStroke = overloaded ? "#7f1d1d" : reversed ? "#f97316" : selected ? "#4da3ff" : "#09090B";
        
  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {tooltip && <title>{tooltip}</title>}

      <circle cx={0} cy={0} r={bodyRadius} fill={bodyFill} stroke={bodyStroke} strokeWidth={overloaded || reversed ? 2 : selected ? 2 : 1.5} />

      {!overloaded && (
        <>
          <circle cx={0} cy={0} r={3.25 * GRID} fill="#202024" stroke="#3F3F46" strokeWidth={1} />

          {/* Speaker */}
          <circle cx={0} cy={0} r={2.15 * GRID} fill="#09090B" stroke="#52525B" strokeWidth={1} />
          <circle cx={0} cy={0} r={1.35 * GRID} fill="#18181B" />
          <circle cx={0} cy={0} r={0.55 * GRID} fill="#09090B" />

          {/* Speaker ring */}
          <path
            d={`M ${-1.7 * GRID} ${-0.9 * GRID} A ${1.9 * GRID} ${1.9 * GRID} 0 0 1 ${1.7 * GRID} ${-0.9 * GRID}`}
            fill="none"
            stroke="#52525B"
            strokeWidth={0.7}
          />
          <path
            d={`M ${-1.7 * GRID} ${0.9 * GRID} A ${1.9 * GRID} ${1.9 * GRID} 0 0 0 ${1.7 * GRID} ${0.9 * GRID}`}
            fill="none"
            stroke="#52525B"
            strokeWidth={0.7}
          />
        </>
      )}

      {/* Polarity markings -- dim once burned out, since the driver is dead either way */}
      <text
        x={-2.7 * GRID}
        y={2.5 * GRID}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={"#dc2626"}
        fontSize={1.5 * GRID}
        fontWeight="bold"
        pointerEvents="none"
      >
        +
      </text>
      <text
        x={2.7 * GRID}
        y={2.5 * GRID}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={"#A1A1AA"}
        fontSize={1.5 * GRID}
        fontWeight="bold"
        pointerEvents="none"
      >
        −
      </text>

      {overloaded && <OvercurrentBurst cx={0} cy={0} size={bodyRadius * 1.4} />}

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyRadius} x2={pin.x * GRID} y2={pinY} />
          <Pin
            x={pin.x * GRID}
            y={pinY}
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