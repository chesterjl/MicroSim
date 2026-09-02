import { useEffect, useRef, useState } from "react";
import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { useCircuitStore } from "../../store/circuitStore";
import { PinDot } from "../../components/parts/pin/PinDot";
import { PinLabel } from "../../components/parts/pin/PinLabel";

const KNOB_RADIUS = 2.5 * GRID;
const BEZEL_RADIUS = 3.4 * GRID;
const TRAVEL = BEZEL_RADIUS - KNOB_RADIUS;
const CLICK_MOVE_THRESHOLD = 3;
const CENTER_ZONE_FRACTION = 0.25;

interface JoystickPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function JoystickPart({ part, selected, pinStates, onPinClick }: JoystickPartProps) {
  const def = partDefinitions.joystick;
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);

  const xPos = (part.properties?.x as number) ?? 0.5;
  const yPos = (part.properties?.y as number) ?? 0.5;
  const pressed = Boolean(part.properties?.pressed);

  const bezelRef = useRef<SVGCircleElement>(null);
  const dragInfoRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);
  // True for the duration of a center-zone mousedown -- i.e. the user is
  // pressing the Z-axis button, not tilting the stick. Mirrors
  // Pushbutton.tsx's press-and-hold: engage on mousedown, release on
  // mouseup, regardless of any movement in between.
  const pressHoldRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const bezelCy = -1.5 * GRID;
  const maskId = `joystick-pcb-mask-${part.id}`;

  const cornerHoles = [
    { x: -42, y: -37 },
    { x: 42, y: -37 },
  ];

  function applyFromClient(clientX: number, clientY: number) {
    const rect = bezelRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    let dx = (clientX - centerX) / radius;
    let dy = (clientY - centerY) / radius;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }

    updatePartProperties(part.id, { x: 0.5 + dx * 0.5, y: 0.5 + dy * 0.5 });
  }

  function isCenterZone(clientX: number, clientY: number): boolean {
    const rect = bezelRef.current?.getBoundingClientRect();
    if (!rect) return false;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - centerX, clientY - centerY);

    return dist < rect.width * CENTER_ZONE_FRACTION;
  }

  function resolveEdgeClick(clientX: number, clientY: number) {
    const rect = bezelRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    if (Math.abs(dx) > Math.abs(dy)) {
      updatePartProperties(part.id, { x: dx < 0 ? 0 : 1, y: 0.5 });
    } else {
      updatePartProperties(part.id, { y: dy < 0 ? 0 : 1, x: 0.5 });
    }
  }

  function handleKnobMouseDown(e: React.MouseEvent) {
    e.stopPropagation();

    if (isCenterZone(e.clientX, e.clientY)) {
      // Press-and-hold: engage immediately, same as Pushbutton's cap.
      pressHoldRef.current = true;
      if (!pressed) updatePartProperties(part.id, { pressed: true });
      setDragging(true); // still ride the window mouseup listener below
      return;
    }

    pressHoldRef.current = false;
    dragInfoRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: MouseEvent) {
      if (pressHoldRef.current) return; // holding the button -- stick doesn't tilt

      const info = dragInfoRef.current;
      if (info) {
        const dist = Math.hypot(e.clientX - info.startX, e.clientY - info.startY);
        if (dist > CLICK_MOVE_THRESHOLD) info.moved = true;
      }
      applyFromClient(e.clientX, e.clientY);
    }

    function onUp(e: MouseEvent) {
      if (pressHoldRef.current) {
        // Release the button the moment the mouse comes up, regardless
        // of movement -- unlike the edge/drag path below, a hold has no
        // "was this a click or a drag" ambiguity to resolve.
        updatePartProperties(part.id, { pressed: false });
        pressHoldRef.current = false;
      } else {
        const info = dragInfoRef.current;
        if (info && !info.moved) {
          resolveEdgeClick(e.clientX, e.clientY);
        }
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
  }, [dragging]);

  const stickX = (xPos - 0.5) * 2 * TRAVEL;
  const stickY = (yPos - 0.5) * 2 * TRAVEL;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <defs>
        <mask id={maskId}>
          <rect x={-5.5 * GRID} y={-5 * GRID} width={11 * GRID} height={10 * GRID} rx={6} fill="#ffffff" />
          {cornerHoles.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#000000" />
          ))}
        </mask>
      </defs>

      {/* PCB Base */}
      <rect
        x={-5.5 * GRID}
        y={-5 * GRID}
        width={11 * GRID}
        height={10 * GRID}
        rx={6}
        fill="#1a7a3c"
        stroke={selected ? "#4da3ff" : "#0d3f1f"}
        strokeWidth={selected ? 2.5 : 1.5}
        mask={`url(#${maskId})`}
      />

      {cornerHoles.map((pt, i) => (
        <circle key={`ring-${i}`} cx={pt.x} cy={pt.y} r={3} fill="none" stroke="#bff2d1" strokeWidth={1.5} />
      ))}

      <text
        x={-5.5 * GRID + 6}
        y={2.3 * GRID}
        fontSize={6}
        fontWeight={700}
        fill="#d9ffe6"
        fontFamily="sans-serif"
        transform={"rotate-90"}
      >
        Analog Joystick
      </text>

      {/* Joystick Bezel */}
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

      {/* Joystick Knob */}
      <g transform={`translate(${stickX}, ${bezelCy + stickY})`} pointerEvents="none">
        <circle r={KNOB_RADIUS} fill="#8a8a8e" stroke={pressed ? "#22c55e" : "#38bdf8"} strokeWidth={3} />
        <ellipse cx={-7} cy={-9} rx={10} ry={6} fill="#ffffff" opacity={0.15} />
        <polygon points="0,-19 -6,-10 6,-10" fill="#e4e4e7" opacity={0.85} />
        <polygon points="0,19 -6,10 6,10" fill="#e4e4e7" opacity={0.85} />
        <polygon points="-19,0 -10,-6 -10,6" fill="#e4e4e7" opacity={0.85} />
        <polygon points="19,0 10,-6 10,6" fill="#e4e4e7" opacity={0.85} />
        <circle r={7} fill={pressed ? "#16a34a" : "#6b6b70"} opacity={0.8} />
      </g>

      {/* Pins and Labels */}
      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLabel x={pin.x * GRID} y={pin.y * GRID - 8} color="#d9ffe6" text={pin.label} />

          <circle cx={pin.x * GRID} cy={pin.y * GRID} r={3.5} fill="#c7c7c7" strokeWidth={0.5} />
          <circle cx={pin.x * GRID} cy={pin.y * GRID} r={1.5} fill="#0f172a" />

          <PinDot
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