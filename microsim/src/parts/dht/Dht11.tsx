import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import { DEFAULT_DHT11_HUMIDITY_PERCENT, DEFAULT_DHT11_TEMPERATURE_C, partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLabel } from "../../components/parts/pin/PinLabel";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import type { NetState } from "../../engine/netlist";

interface Dht11PartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function Dht11Part({ part, selected, pinStates, onPinClick }: Dht11PartProps) {
  const def = partDefinitions.dht11;

  const temperatureC = Number(part.properties?.temperatureC ?? DEFAULT_DHT11_TEMPERATURE_C);
  const humidityPercent = Number(part.properties?.humidityPercent ?? DEFAULT_DHT11_HUMIDITY_PERCENT);

  // Check pin states directly instead of calling netlist.isPowered()
  const vccState = pinStates?.["vcc"] ?? pinStates?.["1"];
  const gndState = pinStates?.["gnd"] ?? pinStates?.["4"];
  const powered = vccState === "HIGH" && gndState === "LOW";

  const halfW = (def.widthUnits * GRID) / 2;
  const bodyTop = -6 * GRID;
  const bodyBottom = 3 * GRID;
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

      {/* Perforated sensing-element grille */}
      <rect x={-halfW + 7} y={bodyTop + 6} width={halfW * 2 - 14} height={5 * GRID} rx={2} fill={`url(#${meshId})`} stroke="#2f5f8f" strokeWidth={1} />

      <text x={0} y={bodyBottom - 25} textAnchor="middle" fontSize={7} fontWeight={700} fill="#ffffff" fontFamily="monospace">DHT11</text>

      {powered && (
        <text x={0} y={bodyBottom - 6} textAnchor="middle" fontSize={5.5} fontWeight={600} fill="#dff3ff" fontFamily="monospace">
          {temperatureC.toFixed(1)}°C {humidityPercent.toFixed(0)}%RH
        </text>
      )}

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyBottom} x2={pin.x * GRID} y2={pin.y * GRID} />

          <PinLabel x={pin.x * GRID} y={pin.y * GRID - 33} text={pin.label} />
            
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