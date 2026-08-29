import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";

export function DcGearMotorPart({
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
  const def = partDefinitions["dc-gearmotor"];

  // Forward = negative lead sits on the circuit's low/ground side and
  // positive sits on the high/power side -- exactly how a real DC motor
  // only spins one way for a given polarity. Swap the leads and it still
  // spins, just the opposite direction, same as reversing leads for real.
  const isForward = pinStates?.positive === "high" && pinStates?.negative === "low";
  const isReversed = pinStates?.positive === "low" && pinStates?.negative === "high";
  const isSpinning = isForward || isReversed;

  const gearboxW = 66;
  const gearboxTop = -92;
  const gearboxBottom = 38;
  const motorBottom = 70;
  const connectorBottom = 96;
  const shaftTipY = 118;

  // Mounting-wing geometry -- these ARE the part's output shaft ends on
  // this motor style (the real photo's horizontal bar passing straight
  // through the gearbox), so the spin indicator lives at their outer
  // tips instead of a separate stub below the body.
  const wingY = gearboxTop + 32; // -60
  const wingH = 15;
  const wingCenterY = wingY + wingH / 2; // -52.5
  const leftWingX = -gearboxW / 2 - 50; // -83 (outer/left tip)
  const leftWingW = gearboxW - 15; // 51
  const rightWingX = -gearboxW / 2 + 65; // 32
  const rightWingW = gearboxW - 15; // 51
  const rightTipX = rightWingX + rightWingW; // 83

  const spinFrom = isForward ? "0" : "360";
  const spinTo = isForward ? "360" : "0";

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Top shaft nub */}
      <rect x={-6} y={gearboxTop - 15} width={12} height={15} rx={2} fill="#f4d128" />

      {/* Yellow gearbox body */}
      <rect
        x={-gearboxW / 2}
        y={gearboxTop}
        width={gearboxW}
        height={gearboxBottom - gearboxTop}
        rx={6}
        fill="#f4d128"
        stroke={selected ? "#4da3ff" : "#c9a916"}
        strokeWidth={selected ? 2.5 : 1.2}
      />

      {/* Mounting wings left */}
      <rect
        x={leftWingX}
        y={wingY}
        width={leftWingW}
        height={wingH}
        rx={3}
        fill="#f2f2f2"
        stroke="#d4d4d8"
        strokeWidth={1}
      />

      {/* Mounting wings right */}
      <rect
        x={rightWingX}
        y={wingY}
        width={rightWingW}
        height={wingH}
        rx={3}
        fill="#f2f2f2"
        stroke="#d4d4d8"
        strokeWidth={1}
      />

      {/* Small side tab */}
      <rect x={gearboxW / 2 - 2} y={gearboxTop + 76} width={10} height={16} rx={2} fill="#f4d128" stroke="#c9a916" strokeWidth={1} />

      {/* Gray motor housing collar just below the gearbox */}
      <rect
        x={-gearboxW / 2 + 4}
        y={gearboxBottom - 8}
        width={gearboxW - 8}
        height={motorBottom - gearboxBottom + 8}
        rx={4}
        fill="#e4e4e7"
        stroke="#a1a1aa"
        strokeWidth={1}
      />

      {/* Dark connector block */}
      <rect
        x={-gearboxW / 2 + 10}
        y={motorBottom - 4}
        width={gearboxW - 20}
        height={connectorBottom - motorBottom + 4}
        rx={2}
        fill="#27272a"
      />

      {/* Wire leads -- black (negative) above red (positive), exiting left */}
      <line
        x1={def.pins[0].x * GRID + 10}
        y1={def.pins[0].y * GRID}
        x2={-gearboxW / 2 - 2}
        y2={motorBottom - 25}
        stroke="#18181b"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <line
        x1={def.pins[1].x * GRID + 12}
        y1={def.pins[1].y * GRID}
        x2={-gearboxW / 2 + 2}
        y2={motorBottom - 10}
        stroke="#dc2626"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle cx={-gearboxW / 2 + 10} cy={motorBottom - 25} r={2.5} fill="#3f3f46" />
      <circle cx={-gearboxW / 2 + 10} cy={motorBottom - 10} r={2.5} fill="#991b1b" />

      {/* Output shaft -- static now, purely cosmetic; the spinning
          happens at the wing tips below instead. */}
      <rect x={-2.5} y={connectorBottom} width={5} height={shaftTipY - connectorBottom} fill="#a1a1aa" />
      <circle cx={0} cy={shaftTipY} r={3.5} fill="#71717a" stroke="#3f3f46" strokeWidth={1} />

      {/* Spin indicator, left wing tip */}
      <g transform={`translate(${leftWingX}, ${wingCenterY})`}>
        <circle r={6} fill="#d4d4d8" stroke="#a1a1aa" strokeWidth={1} />
        <g>
          {isSpinning && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`${spinFrom} 0 0`}
              to={`${spinTo} 0 0`}
              dur="0.6s"
              repeatCount="indefinite"
            />
          )}
          <line x1={-5} y1={0} x2={5} y2={0} stroke="#52525b" strokeWidth={2} strokeLinecap="round" />
        </g>
      </g>

      {/* Spin indicator, right wing tip */}
      <g transform={`translate(${rightTipX}, ${wingCenterY})`}>
        <circle r={6} fill="#d4d4d8" stroke="#a1a1aa" strokeWidth={1} />
        <g>
          {isSpinning && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`${spinFrom} 0 0`}
              to={`${spinTo} 0 0`}
              dur="0.6s"
              repeatCount="indefinite"
            />
          )}
          <line x1={-5} y1={0} x2={5} y2={0} stroke="#52525b" strokeWidth={2} strokeLinecap="round" />
        </g>
      </g>

      {def.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={pin.y * GRID}
          pinId={pin.id}
          label={pin.id === "positive" ? "+" : "−"}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}