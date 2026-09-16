import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { useCircuitStore } from "../../store/circuitStore";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

interface ServoMG90PartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

const CHARRED_BODY = "#2a1b12";
const CHARRED_STROKE = "#7f1d1d";

export function ServoMG90Part({ part, selected, pinStates, netlist, onPinClick }: ServoMG90PartProps) {
  const def = partDefinitions["servo-mg90"];

  const overloaded = netlist?.hasFlag("servoOverloaded", part.id) ?? false;
  const reading = netlist?.getElectricalReading(part.id) ?? null;

  const tooltip = reading
    ? overloaded
      ? `Servo MG90 -- BURNED OUT (${(reading.currentAmps * 1000).toFixed(0)}mA exceeded rated max)`
      : `Servo MG90 -- ${(reading.currentAmps * 1000).toFixed(0)}mA @ ${reading.loopVoltage.toFixed(2)}V`
    : undefined;

  const liveAngle = useCircuitStore((s) => s.servoAngles?.[part.id]);
  const staticAngle = (part.properties?.angle as number) ?? 90;
  // A stalled/burned-out servo freezes at its last commanded position
  // instead of continuing to track new angle updates.
  const angle = overloaded ? staticAngle : liveAngle ?? staticAngle;

  const hornRotation = angle - 90;
  const bodyWidth = 8 * GRID;
  const bodyTop = -7 * GRID;

  const bodyFill = overloaded ? CHARRED_BODY : "#1684C4";
  const bodyStroke = overloaded ? CHARRED_STROKE : selected ? "#4da3ff" : "#075985";

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {tooltip && <title>{tooltip}</title>}

      {/* Connector cable/neck */}
      <rect
        x={-4 * GRID}
        y={-9 * GRID}
        width={8 * GRID}
        height={3 * GRID}
        rx={0.6 * GRID}
        fill="#18181B"
        stroke="#09090B"
        strokeWidth={1}
      />

      {/* Connector top */}
      <rect
        x={-4 * GRID}
        y={-10.5 * GRID}
        width={8 * GRID}
        height={1.8 * GRID}
        rx={0.4 * GRID}
        fill="#27272A"
        stroke="#09090B"
        strokeWidth={1}
      />

      {/* Connector holes */}
      {[-2.5, 0, 2.5].map((x, i) => (
        <rect
          key={`connector-hole-${i}`}
          x={(x - 0.65) * GRID}
          y={-10.15 * GRID}
          width={1.3 * GRID}
          height={1 * GRID}
          rx={0.2 * GRID}
          fill="#09090B"
        />
      ))}

      {/* Main Servo Body */}
      <rect
        x={-bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={14 * GRID}
        rx={0.8 * GRID}
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth={overloaded ? 2 : selected ? 2 : 1.2}
      />

      {/* Left mounting rail */}
      <rect
        x={-4.8 * GRID}
        y={-5.5 * GRID}
        width={1.3 * GRID}
        height={11 * GRID}
        rx={0.3 * GRID}
        fill={overloaded ? "#3a2418" : "#0F6FA8"}
        stroke={overloaded ? CHARRED_STROKE : "#075985"}
        strokeWidth={0.8}
      />

      {/* Right mounting rail */}
      <rect
        x={3.5 * GRID}
        y={-5.5 * GRID}
        width={1.3 * GRID}
        height={11 * GRID}
        rx={0.3 * GRID}
        fill={overloaded ? "#3a2418" : "#0F6FA8"}
        stroke={overloaded ? CHARRED_STROKE : "#075985"}
        strokeWidth={0.8}
      />

      {/* Mounting holes */}
      <circle cx={-4.15 * GRID} cy={-4.5 * GRID} r={0.7 * GRID} fill={overloaded ? "#3a2418" : "#0F6FA8"} stroke={overloaded ? CHARRED_STROKE : "38BDF8"}  strokeWidth={0.7} />
      <circle cx={4.15 * GRID} cy={-4.5 * GRID} r={0.7 * GRID} fill={overloaded ? "#3a2418" : "#0F6FA8"}  stroke={overloaded ? CHARRED_STROKE : "38BDF8"}  strokeWidth={0.7} />
      <circle cx={-4.15 * GRID} cy={5 * GRID} r={0.7 * GRID} fill={overloaded ? "#3a2418" : "#0F6FA8"}  stroke={overloaded ? CHARRED_STROKE : "38BDF8"}  strokeWidth={0.7} />
      <circle cx={4.15 * GRID} cy={5 * GRID} r={0.7 * GRID} fill={overloaded ? "#3a2418" : "#0F6FA8"}  stroke={overloaded ? CHARRED_STROKE : "38BDF8"}  strokeWidth={0.7} />

      {/* Gear / servo output */}
      <circle cx={0} cy={0} r={2.8 * GRID} fill="#E5E7EB" stroke="#6B7280" strokeWidth={1} />

      {/* Gear teeth */}
      <path
        d={`
          M ${-1.2 * GRID} ${-2.5 * GRID}
          L ${-0.8 * GRID} ${-3.1 * GRID}
          L ${0.8 * GRID} ${-3.1 * GRID}
          L ${1.2 * GRID} ${-2.5 * GRID}
          L ${2.5 * GRID} ${-1.2 * GRID}
          L ${3.1 * GRID} ${-0.8 * GRID}
          L ${3.1 * GRID} ${0.8 * GRID}
          L ${2.5 * GRID} ${1.2 * GRID}
          L ${1.2 * GRID} ${2.5 * GRID}
          L ${0.8 * GRID} ${3.1 * GRID}
          L ${-0.8 * GRID} ${3.1 * GRID}
          L ${-1.2 * GRID} ${2.5 * GRID}
          L ${-2.5 * GRID} ${1.2 * GRID}
          L ${-3.1 * GRID} ${0.8 * GRID}
          L ${-3.1 * GRID} ${-0.8 * GRID}
          L ${-2.5 * GRID} ${-1.2 * GRID}
          Z
        `}
        fill="#F3F4F6"
        stroke="#9CA3AF"
        strokeWidth={0.8}
      />

      {/* Output shaft */}
      <circle cx={0} cy={0} r={1.15 * GRID} fill="#D1D5DB" stroke="#6B7280" strokeWidth={0.8} />
      <circle cx={0} cy={0} r={0.45 * GRID} fill="#71717A" />

      {/* Servo horn -- frozen at last commanded angle when burned out */}
      <g transform={`rotate(${hornRotation})`} style={{ transition: overloaded ? "none" : "transform 30ms linear" }}>
        <rect
          x={-0.6 * GRID}
          y={-7 * GRID}
          width={1.2 * GRID}
          height={7 * GRID}
          rx={0.6 * GRID}
          fill="#F4F4F5"
          stroke="#9CA3AF"
          strokeWidth={0.8}
        />

        {/* Horn holes */}
        {[-5.6, -4, -2.4, -0.9].map((y, i) => (
          <circle key={`horn-hole-${i}`} cx={0} cy={y * GRID} r={0.26 * GRID} fill="#6B7280" />
        ))}
      </g>

      {overloaded && <OvercurrentBurst cx={0} cy={0} size={bodyWidth * 1.1} />}

      {/* Dynamically positioned Pins derived directly from config */}
      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyTop} x2={pin.x * GRID} y2={pin.y * GRID}/>
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