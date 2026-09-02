import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { PinDot } from "../../components/parts/pin/PinDot";
import { PinLabel } from "../../components/parts/pin/PinLabel";

const TERMINAL_PIN_IDS = new Set(["no", "com", "nc"]);
const HEADER_PIN_IDS = new Set(["vcc", "gnd", "in"]);

interface RelayPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function RelayPart({ part, selected, pinStates, netlist, onPinClick }: RelayPartProps) {
  const def = partDefinitions.relay;
  const halfW = (def.widthUnits * GRID) / 2;
  const halfH = (def.heightUnits * GRID) / 2;

  const powered = netlist?.isPowered(part.id) ?? false;
  const energized = netlist?.isRelayEnergized(part.id) ?? false;

  const headerEdgeX = -halfW;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <rect
        x={-halfW}
        y={-halfH}
        width={halfW * 2}
        height={halfH * 2}
        rx={6}
        fill="#ae260e"
        stroke={selected ? "#4da3ff" : "#ae260e"}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Corner mounting holes */}
      {[
        { x: -halfW + 8, y: -halfH + 8 },
        { x: halfW - 8, y: -halfH + 8 },
        { x: -halfW + 8, y: halfH - 8 },
        { x: halfW - 8, y: halfH - 8 },
      ].map((hole, i) => (
        <g key={`hole-${i}`} transform={`translate(${hole.x}, ${hole.y})`}>
          <circle r={3.5} fill="#cbd5e1" />
          <circle r={2} fill="#14532d" />
        </g>
      ))}

      {/* PWR indicator LED */}
      <g transform={`translate(-22, ${-halfH + 12})`}>
        <rect x={-10} y={-4} width={20} height={8} rx={2} fill={powered ? "#ef4444" : "#e2e8f0"} stroke="#64748b" strokeWidth={0.8} />
        {powered && (
          <rect x={-10} y={-4} width={20} height={8} rx={2} fill="#fca5a5" opacity={0.6} className="pointer-events-none" />
        )}
        <text x={14} y={3} fontSize={6.5} fontWeight={700} fill="#f0fdf4" fontFamily="monospace">PWR</text>
      </g>

      <g transform={`translate(-22, ${halfH - 12})`}>
        <rect x={-10} y={-4} width={20} height={8} rx={2} fill={energized ? "#22c55e" : "#e2e8f0"} stroke="#64748b" strokeWidth={0.8} />
        {energized && (
          <rect x={-10} y={-4} width={20} height={8} rx={2} fill="#86efac" opacity={0.7} className="pointer-events-none" />
        )}
        <text x={14} y={3} fontSize={6.5} fontWeight={700} fill="#f0fdf4" fontFamily="monospace">LED1</text>
      </g>

      {/* Blue Relay Cube */}
      <rect x={-32} y={-24} width={85} height={50} rx={4} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.5} />
      <text x={8} y={-2} textAnchor="middle" fontSize={11} fontWeight={800} fill="#ffffff" fontFamily="system-ui, sans-serif">
        Relay
      </text>
      <text x={8} y={9} textAnchor="middle" fontSize={6.5} fontWeight={600} fill="#dbeafe" fontFamily="system-ui, sans-serif">
        Module
      </text>
      <circle cx={-18} cy={18} r={2.5} fill={energized ? "#facc15" : "#1e3a8a"} className="pointer-events-none" />

      {/* Right header container (terminal block) */}
      <rect x={halfW - 30} y={-38} width={18} height={76} rx={3} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.2} />

      {/* Left header connector */}
      <rect x={headerEdgeX + 18} y={-38} width={18} height={76} rx={3} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.2} />

      {def.pins.map((pin) => {
        const isTerminal = TERMINAL_PIN_IDS.has(pin.id);
        const isHeader = HEADER_PIN_IDS.has(pin.id);

        const labelX = isTerminal ? halfW - 10 : headerEdgeX + 2.5;
        const labelY = isTerminal ? pin.y * GRID + 3 : pin.y * GRID + 2.5;
        const labelFontSize = isTerminal ? 6.5 : 6;

        return (
          <g key={pin.id}>
            {(isTerminal || isHeader) && (
              <g>
                <PinLabel x={labelX} y={labelY} text={pin.label} color="#f0fdf4" fontSize={labelFontSize} textAnchor="start" />
                <circle cx={pin.x * GRID} cy={pin.y * GRID} r={4.5} fill="#f1f5f9" stroke="#0369a1" strokeWidth={1} className="pointer-events-none"/>
              </g>
            )}
            
            <PinDot
              x={pin.x * GRID}
              y={pin.y * GRID}
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