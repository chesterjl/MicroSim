import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../netlist";
import { partDefinitions } from "../partDefinitions";
import { PinDot } from "./PinDot";

export function PushbuttonPart({
  part,
  selected,
  onToggle,
  pinStates,
}: {
  part: PartInstance;
  selected: boolean;
  onToggle?: (partId: string) => void;
  pinStates?: Record<string, NetState>;
}) {
  const pressed = Boolean(part.properties.pressed);
  const def = partDefinitions.pushbutton;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation})`}>
      {/* base */}
      <rect
        x={-2 * GRID}
        y={-2 * GRID}
        width={4 * GRID}
        height={4 * GRID}
        rx={2}
        fill="#333"
        stroke={selected ? "#4da3ff" : "#111"}
        strokeWidth={selected ? 2 : 1}
      />
      {/* cap — click to press/release in simulation mode */}
      <rect
        x={-1.2 * GRID}
        y={-1.2 * GRID}
        width={2.4 * GRID}
        height={2.4 * GRID}
        rx={2}
        fill={pressed ? "#666" : "#ccc"}
        style={{ cursor: onToggle ? "pointer" : "default" }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.(part.id);
        }}
      />

      {def.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={pin.y * GRID}
          pinId={pin.id}
          label={pin.label}
          state={pinStates?.[pin.id]}
        />
      ))}
    </g>
  );
}
