import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";

interface HcSr04PartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function HcSr04Part({ part, selected, pinStates, onPinClick }: HcSr04PartProps) {
  const def = partDefinitions["ultrasonic-hcsr04"];

  const halfW = (def.widthUnits * GRID) / 2;
  const bodyTop = -4 * GRID;
  const bodyBottom = 3 * GRID;
  const pcbWidth = halfW * 2;
  const pcbHeight = bodyBottom - bodyTop;

  const maskId = `hcsr04-pcb-mask-${part.id}`;

  const cornerHoles = [
    { x: -halfW + 5, y: bodyTop + 5 },
    { x: halfW - 5, y: bodyTop + 5 },
    { x: -halfW + 5, y: bodyBottom - 5 },
    { x: halfW - 5, y: bodyBottom - 5 },
  ];

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <defs>
        {/* Mask that cuts real physical holes through the PCB body */}
        <mask id={maskId}>
          {/* White area = keep PCB filled */}
          <rect
            x={-halfW}
            y={bodyTop}
            width={pcbWidth}
            height={pcbHeight}
            rx={4}
            fill="#ffffff"
          />
          {/* Black circles = subtract/cut out from PCB */}
          {cornerHoles.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#000000" />
          ))}
        </mask>
      </defs>

      {/* Dark Navy PCB Body (Masked) */}
      <rect
        x={-halfW}
        y={bodyTop}
        width={pcbWidth}
        height={pcbHeight}
        rx={4}
        fill="#0b3866"
        stroke={selected ? "#4da3ff" : "#072442"}
        strokeWidth={selected ? 2.5 : 1.5}
        mask={`url(#${maskId})`}
      />

      {/* Silver annular rings around the cutout mounting holes */}
      {cornerHoles.map((pt, i) => (
        <circle
          key={`ring-${i}`}
          cx={pt.x}
          cy={pt.y}
          r={2.5}
          fill="none"
          stroke="#d0d0d0"
          strokeWidth={0.8}
        />
      ))}

      {/* Top Crystal Oscillator */}
      <rect x={-8} y={bodyTop + 4} width={16} height={7} rx={3} fill="#b0b0b0" stroke="#707070" strokeWidth={1} />

      {/* Transducer Eyes */}
      {[-1, 1].map((side) => {
        const cx = side * 4.5 * GRID;
        const cy = -0.5 * GRID;
        const rOuter = 2.1 * GRID;

        return (
          <g key={side}>
            {/* Outer metallic bezel */}
            <circle cx={cx} cy={cy} r={rOuter} fill="#d8d8d8" stroke="#8a8a8a" strokeWidth={1} />
            {/* Inner dark bezel shadow */}
            <circle cx={cx} cy={cy} r={rOuter - 3} fill="#4a4a4a" />
            {/* Mesh inner circle */}
            <circle cx={cx} cy={cy} r={rOuter - 6} fill="#808000" />
            <circle cx={cx} cy={cy} r={rOuter - 9} fill="#707070" />
          </g>
        );
      })}

      {/* Center Silkscreen Header */}
      <text
        x={0.2 * GRID}
        y={-1.5 * GRID}
        textAnchor="middle"
        fontSize={8}
        fontWeight={700}
        fill="#ffffff"
        fontFamily="sans-serif"
      >
        HC-SR04
      </text>

      {/* Silkscreen Markings: 'T' and 'R' */}
      <text x={-halfW + 12} y={bodyBottom - 8} fontSize={9} fontWeight={700} fill="#ffffff" fontFamily="sans-serif">
        T
      </text>
      <text x={halfW - 18} y={bodyBottom - 8} fontSize={9} fontWeight={700} fill="#ffffff" fontFamily="sans-serif">
        R
      </text>
      

      
      {/* Pin Soldering Pads & Rotated 90° Labels */}
      {def.pins.map((pin) => {
        const px = pin.x * GRID;
        const padY = bodyBottom - 6;

        return (
          <g key={`pin-group-${pin.id}`}>
            {/* Silver Solder Pad */}
            <rect x={px - 2.5} y={padY - 4} width={5} height={8} rx={2} fill="#b0b0b0" stroke="#707070" strokeWidth={0.5} />
            <circle cx={px} cy={padY} r={1.2} fill="#3a3a3a" />

            {/* Vertical Pin Label (Rotated -90deg) */}
            <text
              x={px}
              y={padY - 8}
              textAnchor="start"
              fontSize={6.5}
              fontWeight={700}
              fill="#ffffff"
              fontFamily="sans-serif"
              transform={`rotate(-90, ${px}, ${padY - 8})`}
            >
              {pin.label}
            </text>

            {/* Lead Line extending to pin position */}
            <line
              x1={px}
              y1={padY}
              x2={px}
              y2={pin.y * GRID}
              stroke="#c7c7c7"
              strokeWidth={2}
            />
          </g>
        );
      })}

      {/* Interactive Pin Nodes */}
      {def.pins.map((pin) => (
        <Pin
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