import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

interface CurrentSourcePartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function CurrentSourcePart({ part, selected, pinStates, netlist, onPinClick }: CurrentSourcePartProps) {
  const def = partDefinitions["current-source"];

  const currentAmps = (part.properties?.currentAmps as number) ?? 0.02;
  const overCompliance = netlist?.hasFlag("currentSourceOverCompliance", part.id) ?? false;

  const tooltip = overCompliance
    ? "DC Current Source -- OVER COMPLIANCE (load needs more voltage than this source can develop)"
    : `DC Current Source -- ${(currentAmps * 1000).toFixed(1)}mA`;

  const bodyR = 1.7 * GRID;
  const bodyFill = overCompliance ? "#1a1108" : "#27272a";
  const strokeColor = overCompliance ? "#7f1d1d" : selected ? "#4da3ff" : "#52525b";
  const arrowColor = overCompliance ? "#7f1d1d" : "#facc15";

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>{tooltip}</title>

      {/* Schematic circle body */}
      <circle cx={0} cy={0} r={bodyR} fill={bodyFill} stroke={strokeColor} strokeWidth={selected ? 2.5 : 1.5} />

      {/* Arrow -- points from negative toward positive, showing the
          direction current is forced through the external circuit */}
      {!overCompliance && (
        <g>
          <line x1={-bodyR * 0.55} y1={0} x2={bodyR * 0.5} y2={0} stroke={arrowColor} strokeWidth={2} strokeLinecap="round" />
          <polygon points={`${bodyR * 0.5},0 ${bodyR * 0.15},-5 ${bodyR * 0.15},5`} fill={arrowColor} />
        </g>
      )}

      {overCompliance && <OvercurrentBurst cx={0} cy={0} size={bodyR * 1.5} />}

      {/* Value label */}
      <text x={0} y={-bodyR - 8} textAnchor="middle" fill="#aaa" fontSize="9" fontWeight="600">
        {(currentAmps * 1000).toFixed(1)}mA
      </text>

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={pin.y * GRID} x2={pin.id === "negative" ? -bodyR : bodyR} y2={0} />
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