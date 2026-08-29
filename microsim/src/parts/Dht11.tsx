import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState, Netlist } from "../engine/netlist";
import {
  DEFAULT_DHT11_HUMIDITY_PERCENT,
  DEFAULT_DHT11_TEMPERATURE_C,
  partDefinitions,
} from "../config/partDefinitions";
import { PinDot } from "./PinDot";

export function Dht11Part({
  part,
  selected,
  pinStates,
  netlist,
  onPinClick,
}: {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}) {
  const def = partDefinitions.dht11;

  const temperatureC = Number(part.properties?.temperatureC ?? DEFAULT_DHT11_TEMPERATURE_C);
  const humidityPercent = Number(part.properties?.humidityPercent ?? DEFAULT_DHT11_HUMIDITY_PERCENT);
  const powered = netlist?.isPowered(part.id) ?? false;

  const halfW = (def.widthUnits * GRID) / 2; // 40
  const bodyTop = -6 * GRID; // -60
  const bodyBottom = 3 * GRID; // 30
  const meshId = `dht11-mesh-${part.id}`;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <defs>
        <pattern id={meshId} width={4} height={4} patternUnits="userSpaceOnUse">
          <rect width={4} height={4} fill="#eef4f8" />
          <circle cx={2} cy={2} r={0.8} fill="#c3cfd6" />
        </pattern>
      </defs>

      {/* Blue plastic body */}
      <rect
        x={-halfW}
        y={bodyTop}
        width={halfW * 2}
        height={bodyBottom - bodyTop}
        rx={4}
        fill="#4b8bc4"
        stroke={selected ? "#4da3ff" : "#2f5f8f"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Perforated sensing-element grille, top section */}
      <rect
        x={-halfW + 7}
        y={bodyTop + 6}
        width={halfW * 2 - 14}
        height={5 * GRID}
        rx={2}
        fill={`url(#${meshId})`}
        stroke="#2f5f8f"
        strokeWidth={1}
      />

      {/* Silkscreen title */}
      <text x={0} y={bodyBottom - 25} textAnchor="middle" fontSize={7} fontWeight={700} fill="#ffffff" fontFamily="monospace">
        DHT11
      </text>

      {/* Live readout, only while VCC + GND actually reach power/ground -- same "powered" pattern as the LCD */}
      {powered && (
        <text x={0} y={bodyBottom - 6} textAnchor="middle" fontSize={5.5} fontWeight={600} fill="#dff3ff" fontFamily="monospace">
          {temperatureC.toFixed(1)}°C {humidityPercent.toFixed(0)}%RH
        </text>
      )}

      {/* Legs down to the pin tips */}
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

      {/* Pin labels, printed just below the body */}
      {def.pins.map((pin) => (
        <text
          key={`label-${pin.id}`}
          x={pin.x * GRID}
          y={pin.y * GRID - 33}
          textAnchor="middle"
          fontSize={5.5}
          fontWeight={700}
          fill="#ffffff"
          fontFamily="monospace"
        >
          {pin.label}
        </text>
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