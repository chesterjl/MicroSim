import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";

const WIRE_COLORS: Record<string, string> = {
  coilA: "#3b82f6", // Blue
  coilB: "#ec4899", // Pink
  coilC: "#eab308", // Yellow
  coilD: "#f97316", // Orange
  com: "#ef4444",   // Red
};

export function Stepper28byj48Part({
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
  const def = partDefinitions["stepper-28byj48"];
  const bodyR = 8 * GRID; // 80
  const bodyCy = -2 * GRID;
  const rotorAngle = Number(part.properties?.rotorAngleDeg ?? 0);

  // Compute bounding X & Y for the pins
  const pinXs = def.pins.map((p) => p.x * GRID);
  const minPinX = Math.min(...pinXs);
  const maxPinX = Math.max(...pinXs);
  const pinY = (def.pins[0]?.y ?? (bodyCy + bodyR + 30) / GRID) * GRID;

  // Connector block dimensions centered vertically around pinY
  const connectorWidth = maxPinX - minPinX + 24;
  const connectorHeight = 20;
  const connectorX = minPinX - 12;
  const connectorY = pinY - connectorHeight / 2; // Center housing on pinY

  // Collar bottom center (where wires exit)
  const collarY = bodyCy + bodyR;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Mounting ears */}
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(${side * bodyR * 0.85}, ${bodyCy - bodyR * 0.55})`}>
          <circle r={9} fill="#c7c7c7" stroke="#8a8a8a" strokeWidth={1} />
          <circle r={4} fill="#4b4b4b" />
        </g>
      ))}

      {/* Silver can body */}
      <circle
        cx={0}
        cy={bodyCy}
        r={bodyR}
        fill="#d4d6d8"
        stroke={selected ? "#4da3ff" : "#8a8a8a"}
        strokeWidth={selected ? 3 : 1.5}
      />
      <circle cx={0} cy={bodyCy} r={bodyR - 6} fill="none" stroke="#b8babc" strokeWidth={1} />

      {/* Rotor pointer */}
      <g transform={`rotate(${rotorAngle} 0 ${bodyCy})`}>
        <line
          x1={0}
          y1={bodyCy}
          x2={0}
          y2={bodyCy - bodyR + 14}
          stroke="#717070"
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0.9}
        />
      </g>
      <circle cx={0} cy={bodyCy} r={4} fill="#717070" />

      {/* Silkscreen text */}
      <text x={0} y={bodyCy - 12} textAnchor="middle" fontSize={9} fontWeight={800} fill="#0f766e" fontFamily="monospace">
        STEP MOTOR
      </text>
      <text x={0} y={bodyCy + 22} textAnchor="middle" fontSize={8} fontWeight={800} fill="#0f766e" fontFamily="monospace">
        28BYJ-48
      </text>
      <text x={0} y={bodyCy + 34} textAnchor="middle" fontSize={7} fontWeight={700} fill="#0f766e" fontFamily="monospace">
        5VDC
      </text>

      {/* Blue base collar */}
      <rect x={-14} y={bodyCy + bodyR - 14} width={28} height={18} rx={4} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.5} />

      {/* Ribbon Wires running from motor blue collar to top of connector block */}
      {def.pins.map((pin, index) => {
        const exitOffset = -8 + (index / Math.max(1, def.pins.length - 1)) * 16;
        const targetX = pin.x * GRID;

        return (
          <path
            key={`wire-${pin.id}`}
            d={`M ${exitOffset} ${collarY - 2} Q ${exitOffset} ${(collarY + connectorY) / 2}, ${targetX} ${connectorY}`}
            fill="none"
            stroke={WIRE_COLORS[pin.id] ?? "#999"}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}

      {/* White Ribbon Connector Housing Block */}
      <rect
        x={connectorX}
        y={connectorY}
        width={connectorWidth}
        height={connectorHeight}
        rx={3}
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth={1.5}
      />
      {/* Connector Inner Slot / Lip Detail */}
      <rect
        x={connectorX + 3}
        y={connectorY + 3}
        width={connectorWidth - 6}
        height={connectorHeight - 6}
        rx={1.5}
        fill="#f1f5f9"
        stroke="#e2e8f0"
        strokeWidth={1}
      />
    
      {/* Interactive Pin Connection Dots dead-center on the actual pin grid coordinate */}
      {def.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={pin.y * GRID}
          pinId={pin.id}
          label={pin.label}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}