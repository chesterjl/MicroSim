import { useState } from "react";
import type { NetState } from "../engine/netlist";

/**
 * Renders the small circle at a pin's location -- the click target used
 * for starting/finishing a wire -- plus a hover tooltip showing the pin's
 * label, like Tinkercad's pin hover behavior.
 *
 * Known limitation: the tooltip renders inline, in the same SVG draw order
 * as everything else, so on rare occasions a wire drawn on top of this
 * part could visually cover it. A guaranteed-always-on-top version would
 * need the hover state lifted up to CircuitCanvas and rendered in its own
 * top-level layer -- fine for now, this covers the common case.
 */

interface PinDotProps {
  x: number;
  y: number;
  pinId: string;
  label: string;
  highlighted?: boolean;
  state?: NetState;
  onClick?: (e: React.MouseEvent) => void;
}

export function PinDot({x, y, pinId, label, highlighted = false, onClick}: PinDotProps) {
  const [hovered, setHovered] = useState(false);
  const tooltipWidth = Math.max(28, label.length * 6.2 + 12);
  
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={hovered || highlighted ? 6 : 4}
        fill="#475569"
        stroke="#1e293b"
        strokeWidth={0.5}
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
      <title>{label}</title>

      {hovered && (
        <g transform={`translate(${x}, ${y - 14})`} pointerEvents="none">
          <rect
            x={-tooltipWidth / 2}
            y={-16}
            width={tooltipWidth}
            height={16}
            rx={4}
            fill="#111827"
            stroke="#4da3ff"
            strokeWidth={1}
          />
          <text x={0} y={-4.5} textAnchor="middle" fontSize={9} fontWeight={600} fill="#f3f4f6" fontFamily="monospace">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}