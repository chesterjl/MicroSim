import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

interface DiodePartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function DiodePart({ part, selected, pinStates, netlist, onPinClick }: DiodePartProps) {
  const isZener = part.type === "zener-diode";
  const def = partDefinitions[isZener ? "zener-diode" : "diode"];

  const forwardVoltageDrop = (part.properties?.forwardVoltageDrop as number) ?? 0.7;
  const zenerVoltage = (part.properties?.zenerVoltage as number) ?? 5.1;

  const isForward = pinStates?.anode === "HIGH" && pinStates?.cathode !== "HIGH";

  // Fault logic state checking
  const rectifierBlown = !isZener && (netlist?.hasFlag("diodeBlown", part.id) ?? false);
  const rectifierBreakdown = !isZener && (netlist?.hasFlag("diodeBreakdown", part.id) ?? false);

  const zenerRegulating = isZener && (netlist?.hasFlag("zenerRegulating", part.id) ?? false);
  const zenerBlown = isZener && (netlist?.hasFlag("zenerBlown", part.id) ?? false);

  const damaged = rectifierBlown || rectifierBreakdown || zenerBlown;
  const regulating = zenerRegulating && !damaged;

  const tooltip = (() => {
    if (isZener) {
      if (zenerBlown) return "Zener Diode -- BLOWN (exceeded power rating)";
      if (regulating) return `Zener Diode -- Vz ${zenerVoltage.toFixed(1)}V -- REGULATING (reverse conducting)`;
      return `Zener Diode -- Vz ${zenerVoltage.toFixed(1)}V${isForward ? " -- forward conducting" : ""}`;
    }
    if (rectifierBreakdown) return "Diode -- BROKEN DOWN (reverse voltage exceeded rating)";
    if (rectifierBlown) return "Diode -- BURNED OUT (forward current exceeded rating)";
    return `Diode -- Vf ${forwardVoltageDrop.toFixed(1)}V${isForward ? " -- conducting" : ""}`;
  })();

  // Body Dimensions
  const bodyWidth = 3.6 * GRID;
  const bodyHeight = 1.4 * GRID;
  const bodyHalfW = bodyWidth / 2;
  const bodyHalfH = bodyHeight / 2;

  // Colors based on diode type and simulation state
  const bodyFill = damaged ? "#1c1917" : "#191919";
  const stripeFill = damaged ? "#52525b" : "#71717a";
  
  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>{tooltip}</title>
    
      {/* Main Diode Cylindrical Body */}
      <rect
        x={-bodyHalfW}
        y={-bodyHalfH}
        width={bodyWidth}
        height={bodyHeight}
        rx={4}
        fill={bodyFill}
        stroke={damaged ? "#7f1d1d" : selected ? "#4da3ff" : "none"}
        strokeWidth={selected ? 2 : 0}
      />

      {/* Cathode Band Stripe */}
      <rect
        x={-bodyHalfW + 6}
        y={-bodyHalfH}
        width={4}
        height={bodyHeight}
        fill={stripeFill}
        rx={1}
      />
  
      {/* Zener Voltage Regulation Indicator Glow */}
      {regulating && (
        <rect
          x={-bodyHalfW - 1}
          y={-bodyHalfH - 1}
          width={bodyWidth + 2}
          height={bodyHeight + 2}
          rx={5}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={2}
          opacity={0.7}
        />
      )}

      {/* Overcurrent Burn Animation */}
      {damaged && <OvercurrentBurst cx={0} cy={0} size={bodyHalfW * 1.5} />}

      {/* Pins and Terminal Legs */}
      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={pin.y * GRID} x2={pin.id === "anode" ? -bodyHalfW : bodyHalfW} y2={0} />
          <Pin x={pin.x * GRID} y={pin.y * GRID} pinId={pin.id} label={pin.label} state={pinStates?.[pin.id]} onClick={(e) => onPinClick?.(pin.id, e)}/>
        </g>
      ))}
    </g>
  );
}