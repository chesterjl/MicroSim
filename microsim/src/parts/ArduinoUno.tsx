import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../netlist";
import { partDefinitions } from "../partDefinitions";
import { PinDot } from "./PinDot";

export function ArduinoUnoPart({
  part,
  selected,
  pinStates,
  isSimulating,
  onPinClick,
}: {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  isSimulating?: boolean;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}) {
  const def = partDefinitions["arduino-uno"];
  const halfW = (def.widthUnits * GRID) / 2;
  const halfH = (def.heightUnits * GRID) / 2;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      {/* USB-B port, left edge */}
      <g transform={`translate(${-halfW - 20}, ${-halfH + 22})`}>
        <rect width={22} height={34} rx={2} fill="#c9c9c9" stroke="#8a8a8a" strokeWidth={1} />
        <rect x={4} y={6} width={14} height={22} rx={1} fill="#3a3a3a" />
        <rect x={7} y={10} width={8} height={14} fill="#4a90d9" />
      </g>

      {/* USB cable -- only appears plugged in while the sim is running,
          so starting the sketch visually "connects" the board like
          plugging it into a computer to upload/run code. */}
      {isSimulating && (
        <g transform={`translate(${-halfW - 20}, ${-halfH + 22})`}>
          {/* cable plug body, extending further left off the board */}
          <rect x={-70} y={2} width={70} height={30} rx={3} fill="#dcdcdc" stroke="#9a9a9a" strokeWidth={1} />
          <rect x={-58} y={7} width={46} height={20} rx={2} fill="#2b2b2b" />
          <rect x={-52} y={11} width={34} height={12} fill="#1a1a1a" />
          {/* strain-relief cable trailing off-canvas to the left */}
          <path d="M -70 17 C -95 17, -95 5, -120 5" stroke="#3a3a3a" strokeWidth={10} fill="none" strokeLinecap="round" />
          <path d="M -70 17 C -95 17, -95 5, -120 5" stroke="#555555" strokeWidth={6} fill="none" strokeLinecap="round" />
        </g>
      )}

      {/* DC barrel jack, bottom-left */}
      <g transform={`translate(${-halfW - 8}, ${halfH - 48})`}>
        <rect width={26} height={32} rx={2} fill="#111827" stroke="#374151" strokeWidth={1} />
        <circle cx={13} cy={16} r={6} fill="#4b5563" />
        <circle cx={13} cy={16} r={3} fill="#111827" />
      </g>

      {/* PCB base */}
      <rect
        x={-halfW}
        y={-halfH}
        width={halfW * 2}
        height={halfH * 2}
        rx={9}
        fill="#00959f"
        stroke={selected ? "#4da3ff" : "#006670"}
        strokeWidth={selected ? 3 : 2}
      />
      <rect
        x={-halfW + 6}
        y={-halfH + 6}
        width={halfW * 2 - 12}
        height={halfH * 2 - 12}
        rx={7}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.2}
        strokeWidth={1}
      />

      {/* Mounting holes */}
      {[
        { x: -halfW + 18, y: -halfH + 18 },
        { x: halfW - 18, y: -halfH + 18 },
        { x: -halfW + 18, y: halfH - 18 },
        { x: halfW - 28, y: halfH - 18 },
      ].map((hole, i) => (
        <g key={i} transform={`translate(${hole.x}, ${hole.y})`}>
          <circle r={6} fill="#d97706" />
          <circle r={4.6} fill="#e5e7eb" />
          <circle r={3.2} fill="#111827" />
        </g>
      ))}

      {/* ATmega328P DIP chip */}
      <g transform="translate(-10, 10)">
        <rect x={-54} y={-17} width={108} height={34} rx={2} fill="#1f1f23" stroke="#000" strokeWidth={1} />
        {Array.from({ length: 14 }).map((_, i) => (
          <g key={i}>
            <rect x={-48 + i * 7.4} y={-19.5} width={3.5} height={5} fill="#9ca3af" />
            <rect x={-48 + i * 7.4} y={14.5} width={3.5} height={5} fill="#9ca3af" />
          </g>
        ))}
        <text x={0} y={4} textAnchor="middle" fontSize={8} fontWeight={600} fill="#a1a1aa" fontFamily="monospace">
          ATMEGA328P
        </text>
      </g>

      {/* Crystal oscillator */}
      <g transform={`translate(${-halfW + 58}, -8)`}>
        <rect x={-7} y={-13} width={14} height={26} rx={6} fill="#d1d5db" stroke="#8a8a8a" strokeWidth={0.8} />
        <text x={0} y={2.5} textAnchor="middle" fontSize={5.5} fill="#4b5563">
          16MHz
        </text>
      </g>

      {/* Reset button */}
      <g transform={`translate(${-halfW + 24}, ${-halfH + 34})`}>
        <rect x={-9} y={-9} width={18} height={18} rx={1} fill="#d1d5db" stroke="#8a8a8a" />
        <circle r={5} fill="#ef4444" />
      </g>
      <text x={-halfW + 46} y={-halfH + 36} fontSize={7} fontWeight={700} fill="#ffffff" fontFamily="monospace">
        RESET
      </text>

      {/* Status LEDs -- ON lights green only while the sim is running */}
      <g transform={`translate(${halfW - 56}, ${-halfH + 30})`}>
        <circle cx={-12} cy={0} r={2.6} fill={isSimulating ? "#22c55e" : "#1f4d33"} />
        <text x={-12} y={9} textAnchor="middle" fontSize={5.5} fill="#fff">
          ON
        </text>
        <circle cx={2} cy={0} r={2.6} fill="#8a6d1a" />
        <text x={2} y={9} textAnchor="middle" fontSize={5.5} fill="#fff">
          L
        </text>
        <circle cx={16} cy={0} r={2.6} fill="#8a6d1a" />
        <text x={16} y={9} textAnchor="middle" fontSize={5.5} fill="#fff">
          TX
        </text>
        <circle cx={30} cy={0} r={2.6} fill="#8a6d1a" />
        <text x={30} y={9} textAnchor="middle" fontSize={5.5} fill="#fff">
          RX
        </text>
      </g>

      {/* Branding */}
      <text x={14} y={-halfH + 42} textAnchor="middle" fontSize={19} fontWeight={900} fill="#ffffff" fontFamily="system-ui, sans-serif">
        ARDUINO
      </text>
      <text x={14} y={-halfH + 56} textAnchor="middle" fontSize={11} fontWeight={700} fill="#c9f7fb" fontFamily="system-ui, sans-serif" letterSpacing={3}>
        UNO
      </text>

      {/* Header section labels */}
      <text x={halfW - 118} y={-halfH + 15} fontSize={7.5} fontWeight={700} fill="#ffffff" fontFamily="sans-serif">
        DIGITAL (PWM ~)
      </text>
      <text x={halfW - 100} y={halfH - 15} fontSize={7.5} fontWeight={700} fill="#ffffff" fontFamily="sans-serif">
        ANALOG IN
      </text>

      {/* Black plastic header strips behind the pin rows */}
      <rect x={-halfW + 110} y={-halfH + 3} width={halfW * 2 - 122} height={13} rx={1} fill="#111827" />
      <rect x={-halfW + 110} y={halfH - 16} width={halfW * 2 - 122} height={13} rx={1} fill="#111827" />

      {/* Every pin: header pocket + interactive dot (hover tooltip built
          into PinDot) + a larger, bolder printed label than before */}
      {def.pins.map((pin) => {
        const isTopRow = pin.y < 0;
        const labelOffset = isTopRow ? 20 : -14;

        return (
          <g key={pin.id}>
            <rect x={pin.x * GRID - 5} y={pin.y * GRID - 5} width={10} height={10} rx={1.5} fill="#1f2937" />
            <PinDot
              x={pin.x * GRID}
              y={pin.y * GRID}
              pinId={pin.id}
              label={pin.label}
              state={pinStates?.[pin.id]}
              onClick={(e) => onPinClick?.(pin.id, e)}
            />
            <text
              x={pin.x * GRID}
              y={pin.y * GRID + labelOffset}
              textAnchor="middle"
              fontSize={7.5}
              fontWeight={700}
              fill="#f3f4f6"
              fontFamily="monospace"
              transform={`rotate(90 ${pin.x * GRID} ${pin.y * GRID + labelOffset})`}
            >
              {pin.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}