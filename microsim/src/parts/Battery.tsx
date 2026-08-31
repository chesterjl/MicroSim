import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { Pin } from "./Pin";
import { PinLeg } from "./PinLeg";

interface BatteryPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function BatteryPart({ part, selected, pinStates, onPinClick }: BatteryPartProps) {
  const voltage = (part.properties?.voltage as number) ?? 9;
  const def = partDefinitions.battery;

  const bodyLeft = -4.5 * GRID; // orange contact cap starts here
  const capRight = 1 * GRID; // boundary between orange cap and dark body
  const bodyRight = 9 * GRID; // right edge of the dark body
  const halfH = 4 * GRID;
  const connectorLeft = -6.5 * GRID; // black snap-connector housing
  const connectorRight = -4.5 * GRID;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Black snap-connector housing */}
      <rect
        x={connectorLeft}
        y={-halfH * 0.55}
        width={connectorRight - connectorLeft}
        height={halfH * 1.1}
        rx={3}
        fill="#1c1c1c"
        stroke="#000"
        strokeWidth={1}
      />

      {/* Orange contact cap section */}
      <rect x={bodyLeft} y={-halfH} width={capRight - bodyLeft} height={halfH * 2} fill="#e2965a" />

      {/* Dark battery body */}
      <rect x={capRight} y={-halfH} width={bodyRight - capRight} height={halfH * 2} rx={4} fill="#2b2b2e" />

      {/* Outline / selection highlight over the whole battery */}
      <rect
        x={bodyLeft}
        y={-halfH}
        width={bodyRight - bodyLeft}
        height={halfH * 2}
        rx={4}
        fill="none"
        stroke={selected ? "#4da3ff" : "#111"}
        strokeWidth={selected ? 2.5 : 1}
      />

      {/* Voltage label, rotated bottom-to-top */}
      <text
        x={(capRight + bodyRight) / 2}
        y={0}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={15}
        fontWeight={700}
        fill="#e5e5e5"
        fontFamily="system-ui, sans-serif"
        transform={`rotate(-90 ${(capRight + bodyRight) / 2} 0)`}
      >
        {voltage}V
      </text>

      {def.pins.map((pin) => {
        const isPositive = pin.id === "positive";
        const pinX = pin.x * GRID;
        const pinY = pin.y * GRID;

        return (
          <g key={pin.id}>
            <PinLeg x1={pinX}y1={pinY} x2={connectorLeft} y2={pinY} color={isPositive ? "#dc2626" : "#2b2b2b"} width={2.5}/>
            <circle cx={(connectorLeft + connectorRight) / 2} cy={pinY} r={3} fill="#3a3a3a" />
            <text  x={pinX + 56} y={isPositive ? pinY + 15 : pinY - 6} fontSize={14} fontWeight={700} fill={isPositive ? "#dc2626" : "#2b2b2b"} textAnchor="middle">
              {isPositive ? "+" : "−"}
            </text>

            <Pin
              x={pinX}
              y={pinY}
              pinId={pin.id}
              label={pin.label}
              state={pinStates?.[pin.id]}
              onClick={(e) => onPinClick?.(pin.id, e)}
            />
          </g>
        );
      })}
    </g>
  );
}