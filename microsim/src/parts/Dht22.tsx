import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState, Netlist } from "../engine/netlist";
import { DEFAULT_DHT22_HUMIDITY_PERCENT, DEFAULT_DHT22_TEMPERATURE_C, partDefinitions } from "../config/partDefinitions";
import { Pin } from "./Pin";
import { PinLabel } from "./PinLabel";
import { PinLeg } from "./PinLeg";

interface Dht22PartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function Dht22Part({ part, selected, pinStates, netlist, onPinClick }: Dht22PartProps) {
  const def = partDefinitions.dht22;

  const temperatureC = Number(part.properties?.temperatureC ?? DEFAULT_DHT22_TEMPERATURE_C);
  const humidityPercent = Number(part.properties?.humidityPercent ?? DEFAULT_DHT22_HUMIDITY_PERCENT);
  const powered = netlist?.isPowered(part.id) ?? false;

  const halfW = (def.widthUnits * GRID) / 2;
  const bodyTop = -6.5 * GRID;
  const bodyBottom = 3 * GRID ;
  const domeR = halfW;
  const barsId = `dht22-bars-${part.id}`;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <defs>
        <pattern id={barsId} width={16} height={6} patternUnits="userSpaceOnUse">
          <rect width={16} height={6} fill="#ffffff" />
          <rect x={1} y={1.5} width={3} height={3} rx={0.5} fill="#1a1a1a" />
          <rect x={6.5} y={1.5} width={3} height={3} rx={0.5} fill="#1a1a1a" />
          <rect x={12} y={1.5} width={3} height={3} rx={0.5} fill="#1a1a1a" />
        </pattern>
      </defs>

      {/* Domed top (rounded roof, like the real module's housing) */}
      <path
        d={`M ${-domeR} ${bodyTop + domeR}
            A ${domeR} ${domeR} 0 0 1 ${domeR} ${bodyTop + domeR}
            L ${domeR} ${bodyTop + domeR}
            Z`}
        fill="#f5f5f5"
        stroke={selected ? "#4da3ff" : "#c9c9c9"}
        strokeWidth={selected ? 2.5 : 1.2}
      />

      {/* White plastic body */}
      <rect
        x={-halfW}
        y={bodyTop + domeR}
        width={halfW * 2}
        height={bodyBottom - (bodyTop + domeR) + 20}
        fill="#f5f5f5"
        stroke={selected ? "#4da3ff" : "#c9c9c9"}
        strokeWidth={selected ? 2.5 : 1.2}
      />

      {/* Mounting hole, top-center */}
      <circle cx={0} cy={bodyTop + domeR * 0.55} r={4.5} fill="#2a2a2a" />

      {/* Perforated sensing-element grille -- rows of dashes, matching the real DHT22 vents */}
      <rect
        x={-halfW + 6}
        y={bodyTop + domeR + 6}
        width={halfW * 2 - 12}
        height={4.5 * GRID}
        fill={`url(#${barsId})`}
      />

      {/* Silkscreen title */}
      <text x={0} y={bodyBottom - 50} textAnchor="middle" fontSize={8} fontWeight={800} fill="#3f3f46" fontFamily="monospace">
        DHT22
      </text>
        
      {/* Live readout, only while VCC + GND actually reach power/ground */}
      {powered && (
        <text x={0} y={bodyTop + domeR - 4} textAnchor="middle" fontSize={5} fontWeight={600} fill="#0f766e" fontFamily="monospace">
          {temperatureC.toFixed(1)}°C {humidityPercent.toFixed(1)}%RH
        </text>
      )}

      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLabel x={pin.x * GRID} y={pin.y * GRID - 32} color="#3f3f46" text={pin.label} />
          
          <PinLeg x1={pin.x * GRID} y1={bodyBottom + 20} x2={pin.x * GRID} y2={pin.y * GRID}/>

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