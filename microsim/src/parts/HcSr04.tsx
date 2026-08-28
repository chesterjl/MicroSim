import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { DEFAULT_ULTRASONIC_DISTANCE_CM, partDefinitions } from "../config/partDefinitions";
import { PinDot } from "./PinDot";

interface HcSr04PartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function HcSr04Part({part, selected, pinStates, onPinClick}: HcSr04PartProps) {
  const def = partDefinitions["ultrasonic-hcsr04"];

  const distanceCm = Number(part.properties?.distanceCm ?? DEFAULT_ULTRASONIC_DISTANCE_CM);
  const thresholdCm = Number(part.properties?.detectionThresholdCm ?? 100);
  const objectDetected = distanceCm <= thresholdCm;
  
  const halfW = (def.widthUnits * GRID) / 2;
  const bodyTop = -3.5 * GRID;
  const bodyBottom = 2.5 * GRID;
  const meshId = `hcsr04-mesh-${part.id}`;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <defs>
        <pattern id={meshId} width={4} height={4} patternUnits="userSpaceOnUse">
          <rect width={4} height={4} fill="#3a3a3a" />
          <circle cx={2} cy={2} r={1.1} fill="#5a5a5a" />
        </pattern>
      </defs>

      {/* PCB body */}
      <rect
        x={-halfW}
        y={bodyTop}
        width={halfW * 2}
        height={bodyBottom - bodyTop}
        rx={5}
        fill="#0f6ea8"
        stroke={selected ? "#4da3ff" : "#0a4a73"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Decorative header bump, top-center (matches the real board) */}
      <rect x={-12} y={bodyTop - 5} width={24} height={9} rx={2} fill="#c7c7c7" />

      {/* Two transducer "eyes" -- read-only ring, mirrors the properties modal's distance/threshold comparison */}
      {[-1, 1].map((side) => (
        <g key={side}>
          <circle cx={side * 2.6 * GRID} cy={-0.9 * GRID} r={2 * GRID} fill={`url(#${meshId})`} stroke="#1a1a1a" strokeWidth={1} />
          {objectDetected && (
            <circle
              cx={side * 2.6 * GRID}
              cy={-0.9 * GRID}
              r={2 * GRID}
              fill="none"
              stroke="#22ff55"
              strokeWidth={2}
              opacity={0.9}
            />
          )}
        </g>
      ))}

      {/* Silkscreen title */}
      <text x={0} y={1.2 * GRID} textAnchor="middle" fontSize={8} fontWeight={700} fill="#e8f4fb" fontFamily="monospace">
        HC-SR04
      </text>

      {/* CHANGED: pin labels now printed ON the blue PCB itself, just above
          where the legs start -- like a real board's silkscreen -- so they
          stay readable even once the legs are fully seated in a breadboard,
          instead of living below the legs where the board hides them. */}
      {def.pins.map((pin) => (
        <text
          key={`label-${pin.id}`}
          x={pin.x * GRID}
          y={bodyBottom - 5}
          textAnchor="middle"
          fontSize={6}
          fontWeight={700}
          fill="#e8f4fb"
          fontFamily="monospace"
        >
          {pin.label}
        </text>
      ))}

      {/* Legs -- x/y positions come straight from partDefinitions.ts, which
          now uses whole grid-unit values only (see the fix there) so they
          can actually land on breadboard holes. */}
      {def.pins.map((pin) => (
        <line
          key={`leg-${pin.id}`}
          x1={pin.x * GRID}
          y1={bodyBottom}
          x2={pin.x * GRID}
          y2={pin.y * GRID}
          stroke="#c7c7c7"
          strokeWidth={2}
        />
      ))}

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