import { useEffect, useRef, useState } from "react";
import { GRID } from "../types/types";
import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";
import { partDefinitions } from "../config/partDefinitions";
import { useCircuitStore } from "../store/circuitStore";
import { PinDot } from "./PinDot";

const KNOB_RADIUS = 2.5 * GRID;
const BEZEL_RADIUS = 3.4 * GRID;
const TRAVEL = BEZEL_RADIUS - KNOB_RADIUS; // how far the knob can move off-center
const CLICK_MOVE_THRESHOLD = 3; // px — below this, mouseup counts as a "click" not a drag
const CENTER_ZONE_FRACTION = 0.25; // inner 25% of bezel radius = the press zone

interface JoystickPartParts {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function JoystickPart({part, selected, pinStates, onPinClick}: JoystickPartParts) {
  const def = partDefinitions.joystick;
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);

  const xPos = (part.properties?.x as number) ?? 0.5;
  const yPos = (part.properties?.y as number) ?? 0.5;
  const pressed = Boolean(part.properties?.pressed);

  const bezelRef = useRef<SVGCircleElement>(null);
  const dragInfoRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const bezelCy = -1.5 * GRID;

  function applyFromClient(clientX: number, clientY: number) {
    const rect = bezelRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    let dx = (clientX - centerX) / radius; // -1..1
    let dy = (clientY - centerY) / radius;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }

    updatePartProperties(part.id, { x: 0.5 + dx * 0.5, y: 0.5 + dy * 0.5 });
  }

  function resolveClickZone(clientX: number, clientY: number) {
    const rect = bezelRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist < rect.width * CENTER_ZONE_FRACTION) {
      updatePartProperties(part.id, { pressed: !pressed });
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      updatePartProperties(part.id, { x: dx < 0 ? 0 : 1, y: 0.5 });
    } else {
      updatePartProperties(part.id, { y: dy < 0 ? 0 : 1, x: 0.5 });
    }
  }

  function handleKnobMouseDown(e: React.MouseEvent) {
    e.stopPropagation(); // don't let CircuitCanvas start dragging the whole part
    dragInfoRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: MouseEvent) {
      const info = dragInfoRef.current;
      if (info) {
        const dist = Math.hypot(e.clientX - info.startX, e.clientY - info.startY);
        if (dist > CLICK_MOVE_THRESHOLD) info.moved = true;
      }
      applyFromClient(e.clientX, e.clientY);
    }

    function onUp(e: MouseEvent) {
      const info = dragInfoRef.current;
      if (info && !info.moved) {
        resolveClickZone(e.clientX, e.clientY);
      }
      dragInfoRef.current = null;
      setDragging(false);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const stickX = (xPos - 0.5) * 2 * TRAVEL;
  const stickY = (yPos - 0.5) * 2 * TRAVEL;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
        {/* PCB */}
        <rect
            x={-5.5 * GRID}
            y={-5 * GRID}
            width={11 * GRID}
            height={10 * GRID}
            rx={6}
            fill="#1a7a3c"
            stroke={selected ? "#4da3ff" : "#0d3f1f"}
            strokeWidth={selected ? 2.5 : 1.5}
        />


        {/* Corner mounting holes */}
        {[
        [-42, -37],
        [42, -37],
        ].map(([hx, hy], i) => (
        <g key={i} transform={`translate(${hx}, ${hy})`}>
            <circle r={5} fill="#bff2d1" />
            <circle r={3} fill="#0d3f1f" />
        </g>
        ))}

        {/* Title */}
        <text x={-5.5 * GRID + 6} y={3 * GRID - 6} fontSize={6} fontWeight={700} fill="#d9ffe6" fontFamily="sans-serif">
        Analog Joystick
        </text>

        
        {/* Bezel — drag/click hit target */}
        <circle
            ref={bezelRef}
            cx={0}
            cy={bezelCy}
            r={BEZEL_RADIUS}
            fill="#141414"
            stroke="#000"
            strokeWidth={1}
            style={{ cursor: "pointer" }}
            onMouseDown={handleKnobMouseDown}
        />

        {/* Knob */}
        <g transform={`translate(${stickX}, ${bezelCy + stickY})`} pointerEvents="none">
            <circle r={KNOB_RADIUS} fill="#8a8a8e" stroke={pressed ? "#22c55e" : "#38bdf8"} strokeWidth={3} />
            <ellipse cx={-7} cy={-9} rx={10} ry={6} fill="#ffffff" opacity={0.15} />
            <polygon points="0,-19 -6,-10 6,-10" fill="#e4e4e7" opacity={0.85} />
            <polygon points="0,19 -6,10 6,10" fill="#e4e4e7" opacity={0.85} />
            <polygon points="-19,0 -10,-6 -10,6" fill="#e4e4e7" opacity={0.85} />
            <polygon points="19,0 10,-6 10,6" fill="#e4e4e7" opacity={0.85} />
            <circle r={7} fill={pressed ? "#16a34a" : "#6b6b70"} opacity={0.8} />
        </g>

        {/* Pin labels + dots */}
        {def.pins.map((pin) => (
        <text
            key={`label-${pin.id}`}
            x={pin.x * GRID}
            y={pin.y * GRID - 8}
            textAnchor="middle"
            fontSize={5.5}
            fontWeight={700}
            fill="#d9ffe6"
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