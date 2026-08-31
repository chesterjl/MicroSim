import { useState } from "react";
import type { NetState } from "../engine/netlist";

interface PinProps {
  x: number;
  y: number;
  pinId: string;
  label: string;
  state?: NetState;
  onClick?: (e: React.MouseEvent) => void;
}

export function Pin({ x, y, pinId, label, onClick }: PinProps) {
  const [hovered, setHovered] = useState(false);

  const tooltipWidth = Math.max(28, label.length * 6.2 + 12);
  const tooltipHeight = 18;
  const offsetX = 8;
  const offsetY = 8;

  const hoverBoxSize = 10;

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={7}
        fill="transparent"
        data-pin-id={pinId}
        className="pin-dot"
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
          strokeWidth={1}
          pointerEvents="none"
        />
      )}

      {/* Tooltip positioned to the bottom-right of the pin */}
      {hovered && (
        <g transform={`translate(${x + offsetX}, ${y + offsetY})`} pointerEvents="none">
          <rect x={0} y={0} width={tooltipWidth} height={tooltipHeight} rx={4} fill="#111827" stroke="#4da3ff" strokeWidth={1} />
          <text x={tooltipWidth / 2} y={12} textAnchor="middle" fontSize={9} fontWeight={600} fill="#f3f4f6" fontFamily="monospace">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}