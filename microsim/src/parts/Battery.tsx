import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";

export function BatteryPart({
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
  const voltage = (part.properties?.voltage as number) ?? 9;
  const def = partDefinitions.battery;

  // Layout, all in px (grid units * GRID), matching def.pins below.
  const bodyLeft = -4.5 * GRID; // orange contact cap starts here
  const capRight = 1 * GRID; // boundary between orange cap and dark body
  const bodyRight = 9 * GRID; // right edge of the dark body
  const halfH = 4 * GRID;
  const connectorLeft = -6.5 * GRID; // black snap-connector housing
  const connectorRight = -4.5 * GRID;
  const wireStartX = -10 * GRID; // pin tip / wire origin

  const negativeY = -1.5 * GRID;
  const positiveY = 1.5 * GRID;
  
  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Snap-connector wires running out to the pin tips */}
      <line x1={wireStartX} y1={negativeY} x2={connectorLeft} y2={negativeY} stroke="#2b2b2b" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={wireStartX} y1={positiveY} x2={connectorLeft} y2={positiveY} stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round" />

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
      <circle cx={(connectorLeft + connectorRight) / 2} cy={negativeY} r={3} fill="#3a3a3a" />
      <circle cx={(connectorLeft + connectorRight) / 2} cy={positiveY} r={3} fill="#3a3a3a" />

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

      {/* Voltage label, rotated to read bottom-to-top like a real 9V battery */}
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

      {/* Terminal glyphs near the wire tips */}
      <text x={wireStartX + 16} y={negativeY - 6} fontSize={11} fontWeight={700} fill="#999" textAnchor="middle">
        −
      </text>
      <text x={wireStartX + 16} y={positiveY + 15} fontSize={11} fontWeight={700} fill="#dc2626" textAnchor="middle">
        +
      </text>

      {def.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={pin.y * GRID}
          pinId={pin.id}
          label={`${pin.label} (${voltage}V)`}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}