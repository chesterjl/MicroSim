import { useState } from "react";
import type { NetState } from "../../../engine/netlist";

interface PinDotProps {
  x: number;
  y: number;
  pinId: string;
  label: string;
  state?: NetState;
  onClick?: (e: React.MouseEvent) => void;
}
export function PinDot({ x, y, pinId, label, onClick }: PinDotProps) {
  const [hovered, setHovered] = useState(false);

  const tooltipWidth = Math.max(24, label.length * 5.4 + 10);
  const tooltipHeight = 15;
  const offsetX = 6;
  const offsetY = 6;

  const hoverBoxSize = 7;

  return (
    <g>
      {/* Visible hole */}
      <circle
        cx={x}
        cy={y}
        r={1.6}
        fill="#3f4654"
        data-pin-id={pinId}
        className="pin-dot"
        pointerEvents="none"
      />

      {/* Bigger invisible hit-area layered on top */}
      <circle
        cx={x}
        cy={y}
        r={6}
        fill="transparent"
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
      />

      {hovered && (
        <rect
          x={x - hoverBoxSize / 2}
          y={y - hoverBoxSize / 2}
          width={hoverBoxSize}
          height={hoverBoxSize}
          fill="#22c55e"
          stroke="#052e16"
          strokeWidth={0.75}
          pointerEvents="none"
        />
      )}

      {/* Tooltip positioned to the Bottom-Right of the hole */}
      {hovered && (
        <g transform={`translate(${x + offsetX}, ${y + offsetY})`} pointerEvents="none">
          {/* Main Tooltip Box */}
          <rect x={0} y={0} width={tooltipWidth} height={tooltipHeight} rx={3} fill="#111827" stroke="#4da3ff" strokeWidth={1}/>

          <text x={tooltipWidth / 2} y={10.5} textAnchor="middle" fontSize={7.5} fontWeight={600} fill="#f3f4f6" fontFamily="monospace">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}