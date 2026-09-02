import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import { partDefinitions } from "../../config/partDefinitions";
import { PinDot } from "../../components/parts/pin/PinDot";
import { PinLabel } from "../../components/parts/pin/PinLabel";
import type { NetState } from "../../engine/netlist";

interface Uln2003DriverPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function Uln2003DriverPart({ part, selected, pinStates, onPinClick }: Uln2003DriverPartProps) {
  const def = partDefinitions["uln2003-driver"];
  const halfW = (def.widthUnits * GRID) / 2;
  const halfH = (def.heightUnits * GRID) / 2;

  const maskId = `uln2003-pcb-mask-${part.id}`;

  const motorPins = def.pins.filter((p) => p.id.startsWith("out") || p.id.startsWith("motor") || p.id.startsWith("coil"));
  const inPins = def.pins.filter((p) => p.id.startsWith("in"));

  const motorPinXs = motorPins.map((p) => p.x * GRID);
  const minMotorX = motorPinXs.length ? Math.min(...motorPinXs) : -32;
  const maxMotorX = motorPinXs.length ? Math.max(...motorPinXs) : 32;
  const motorConnectorW = maxMotorX - minMotorX + 20;

  const cornerHoles = [
    { x: -halfW + 8, y: -halfH + 8 },
    { x: halfW - 8, y: -halfH + 8 },
    { x: -halfW + 8, y: halfH - 8 },
    { x: halfW - 8, y: halfH - 8 },
  ];

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <defs>
        <mask id={maskId}>
          <rect x={-halfW} y={-halfH} width={halfW * 2} height={halfH * 2}
            rx={6}
            fill="#ffffff"
          />
          {cornerHoles.map((hole, i) => (
            <circle key={i} cx={hole.x} cy={hole.y} r={2.5} fill="#000000" />
          ))}
        </mask>
      </defs>

      {/* Green PCB Board */}
      <rect
        x={-halfW}
        y={-halfH}
        width={halfW * 2}
        height={halfH * 2}
        rx={6}
        fill="#15803d"
        stroke={selected ? "#3b82f6" : "#166534"}
        strokeWidth={selected ? 3 : 1.5}
        mask={`url(#${maskId})`}
      />

      {cornerHoles.map((hole, i) => (
        <circle
          key={`pad-${i}`}
          cx={hole.x}
          cy={hole.y}
          r={4.5}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
      ))}

      <rect
        x={-halfW + 4}
        y={-halfH + 4}
        width={halfW * 2 - 8}
        height={halfH * 2 - 8}
        rx={4}
        fill="none"
        stroke="#ffffff"
        strokeWidth={0.8}
        strokeDasharray="4,2"
        opacity={0.3}
      />

      {/* Top Stepper Motor Connector Block */}
      <rect
        x={minMotorX - 10}
        y={-halfH - 2}
        width={motorConnectorW}
        height={18}
        rx={3}
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth={1.5}
      />
      <rect
        x={minMotorX - 7}
        y={-halfH + 1}
        width={motorConnectorW - 6}
        height={12}
        rx={1.5}
        fill="#e2e8f0"
        stroke="#94a3b8"
        strokeWidth={0.8}
      />

      {/* ULN2003 IC Chip */}
      <rect x={-40} y={-12} width={80} height={24} rx={2} fill="#09090b" stroke="#27272a" strokeWidth={1} />
      <path d="M -40 -3 A 3 3 0 0 1 -40 3 Z" fill="#27272a" />
      <text x={0} y={2} textAnchor="middle" fontSize={7.5} fontWeight={800} fill="#e4e4e7" fontFamily="monospace" letterSpacing="1">
        ULN2003A
      </text>

      {/* Jumper Header */}
      <g transform={`translate(${halfW - 22}, ${-halfH + 20})`}>
        <rect x={-2} y={4} width={12} height={12} fill="#1e293b" rx={1} />
        <rect x={-1} y={6} width={10} height={8} fill="#eab308" rx={1} stroke="#ca8a04" strokeWidth={0.8} />
        <text x={4} y={22} textAnchor="middle" fontSize={4.5} fontWeight={700} fill="#ffffff" fontFamily="monospace">
          ON/OFF
        </text>
      </g>

      {/* Header Blocks */}
      <rect x={-halfW + 12} y={halfH - 16} width={halfW * 2 - 24} height={10} rx={1.5} fill="#0f172a" />
      <rect x={halfW - 15} y={-25} width={10} height={56} rx={1.5} fill="#0f172a" />

      <text
        x={halfW - 10}
        y={-2}
        textAnchor="middle"
        fontSize={5.5}
        fontWeight={800}
        fill="#ffffff"
        fontFamily="monospace"
        transform={`rotate(-90 ${halfW - 20} -2)`}
      >
        5-12V
      </text>
      <text
        x={halfW - 25}
        y={14}
        textAnchor="middle"
        fontSize={5.5}
        fontWeight={800}
        fill="#ffffff"
        fontFamily="monospace"
        transform={`rotate(-90 ${halfW - 20} 14)`}
      >
        GND
      </text>

      {def.pins.map((pin) => {
        const isMotorPin = motorPins.some((p) => p.id === pin.id);
        const isInPin = inPins.some((p) => p.id === pin.id);
        const state = pinStates?.[pin.id];
        const lit = state === "HIGH" || state === "LOW";

        return (
          <g key={pin.id}>
            {isMotorPin && (
              <>
                <PinLabel x={pin.x * GRID} y={-halfH + 32} text={pin.label || pin.id.toUpperCase()} fontSize={6}/>
                <circle cx={pin.x * GRID} cy={pin.y * GRID + 14} r={3.5} fill={lit ? "#22c55e" : "#14532d"} stroke={lit ? "#86efac" : "#052e16"} strokeWidth={1} />
              </>
            )}

            {isInPin && (
              <PinLabel x={pin.x * GRID} y={halfH - 20} text={pin.label} fontSize={6} />
            )}

            <circle cx={pin.x * GRID} cy={pin.y * GRID} r={3} fill="#334155" stroke="#64748b" strokeWidth={0.8}/>

            <PinDot
              x={pin.x * GRID}
              y={pin.y * GRID}
              pinId={pin.id}
              label={pin.label}
              state={state}
              onClick={(e) => onPinClick?.(pin.id, e)}
            />
          </g>
        );
      })}
    </g>
  );
}