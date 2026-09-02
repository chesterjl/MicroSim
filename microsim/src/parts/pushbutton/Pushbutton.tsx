import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";

interface PushbuttonPartProps {
  part: PartInstance;
  selected: boolean;
  onToggle?: (partId: string) => void;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function PushbuttonPart({ part, selected, onToggle, pinStates, onPinClick }: PushbuttonPartProps) {
  const pressed = Boolean(part.properties.pressed);
  const def = partDefinitions.pushbutton;
  const baseHalfH = 2 * GRID;

  const cornerRivets = [
    { x: -1.3 * GRID, y: -1.3 * GRID },
    { x: 1.3 * GRID, y: -1.3 * GRID },
    { x: -1.3 * GRID, y: 1.3 * GRID },
    { x: 1.3 * GRID, y: 1.3 * GRID },
  ];

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* Main Metal Casing Base */}
      <rect
        x={-2 * GRID}
        y={-2 * GRID}
        width={4 * GRID}
        height={4 * GRID}
        rx={3}
        fill="#c4c3c3"
        stroke={selected ? "#4da3ff" : "#8e8e8e"}
        strokeWidth={selected ? 2.5 : 1.2}
      />
      {cornerRivets.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r={0.45 * GRID}
          fill="#4a4a4a"
        />
      ))}
      <circle
        cx={0}
        cy={pressed ? 0.3 : 0}
        r={1.25 * GRID}
        fill="#991b1b"
      />

      {/* Circular Button Plunger Cap */}
      <circle
        cx={0}
        cy={pressed ? 0.3 : 0}
        r={1.1 * GRID}
        fill={pressed ? "#ef4444" : "#dc2626"}
        style={{ cursor: "pointer" }}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (!pressed) onToggle?.(part.id);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          if (pressed) onToggle?.(part.id);
        }}
        onMouseLeave={() => {
          if (pressed) onToggle?.(part.id);
        }}
      />

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={Math.sign(pin.y) * baseHalfH} x2={pin.x * GRID} y2={pin.y * GRID}/>
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