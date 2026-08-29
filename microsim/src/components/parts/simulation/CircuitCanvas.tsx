import { useEffect, useMemo, useRef, useState } from "react";
import { useCircuitStore } from "../../../store/circuitStore";
import { buildNetlist } from "../../../engine/netlist";
import { getResolvedPins, snapToGrid } from "../../../utils/geometry";
import { WireLayer } from "../../../parts/WireLayer";
import { partComponentRegistry } from "../../../parts/registry";
import { partDefinitions } from "../../../config/partDefinitions";
import { GRID, type PartInstance, type PinRef } from "../../../types/types";

const WORLD_WIDTH = 7000;
const WORLD_HEIGHT = 7000;

const HAS_MODAL_PROPERTIES_PART = ["led", "resistor", "battery", "potentiometer", "ultrasonic-hcsr04", "photoresistor", "seven-segment", "dht11"];

const SNAP_DISTANCE = 16;

function isBreadboard(type: string) {
  return type.startsWith("breadboard");
}

interface DragState {
  partId: string;
  offsetX: number;
  offsetY: number;
}

interface CircuitCanvasProps {
  zoomLevel: number;
  panOffset: { x: number; y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isSimulating: boolean;
  onOpenProperties: (part: PartInstance) => void;
}

interface PartControlOverlayProps {
  part: PartInstance;
  isSimulating: boolean;
  onDelete: () => void;
  onOpenProperties: () => void;
}

export function CircuitCanvas({ zoomLevel, panOffset, setPanOffset, isSimulating, onOpenProperties }: CircuitCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const worldGroupRef = useRef<SVGGElement>(null);

  const parts = useCircuitStore((s) => s.parts);
  const wires = useCircuitStore((s) => s.wires);
  const digitalPins = useCircuitStore((s) => s.digitalPins);
  const selectedPartId = useCircuitStore((s) => s.selectedPartId);
  const pendingWireStart = useCircuitStore((s) => s.pendingWireStart);
  const draftWaypoints = useCircuitStore((s) => s.draftWaypoints);
  
  const movePart = useCircuitStore((s) => s.movePart);
  const selectPart = useCircuitStore((s) => s.selectPart);
  const deletePart = useCircuitStore((s) => s.deletePart);
  const startWire = useCircuitStore((s) => s.startWire);
  const addWaypoint = useCircuitStore((s) => s.addWaypoint);
  const finishWire = useCircuitStore((s) => s.finishWire);
  const cancelWire = useCircuitStore((s) => s.cancelWire);
  const deleteWire = useCircuitStore((s) => s.deleteWire);
  const togglePushbutton = useCircuitStore((s) => s.togglePushbutton);
  const toggleSwitch = useCircuitStore((s) => s.toggleSwitch);
  const connectPins = useCircuitStore((s) => s.connectPins);
  const removeWiresForPart = useCircuitStore((s) => s.removeWiresForPart);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const effectiveZoom = zoomLevel * 0.9625;

  const netlist = useMemo(
    () => buildNetlist(parts, wires, digitalPins, isSimulating),
    [parts, wires, digitalPins, isSimulating]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && pendingWireStart) {
        cancelWire();
        return;
      }

      const activeEl = document.activeElement;
      const isTyping =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.getAttribute("contenteditable") === "true";
      if (isTyping) return;

      if (!isSimulating && (e.key === "Delete" || e.key === "Backspace") && selectedPartId) {
        deletePart(selectedPartId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPartId, deletePart, pendingWireStart, cancelWire, isSimulating]);

  useEffect(() => {
    if (isSimulating && pendingWireStart) {
      cancelWire();
    }
  }, [isSimulating, pendingWireStart, cancelWire]);

 function toSvgPoint(e: React.MouseEvent | MouseEvent) {
    const worldGroup = worldGroupRef.current;

    if (!worldGroup) {
      return { x: 0, y: 0 };
    }

    const matrix = worldGroup.getScreenCTM();

    if (!matrix) {
      return { x: 0, y: 0 };
    }

    const point = new DOMPoint(e.clientX, e.clientY);
    const localPoint = point.matrixTransform(matrix.inverse());

    return {
      x: localPoint.x + WORLD_WIDTH / 2,
      y: localPoint.y + WORLD_HEIGHT / 2,
    };
  }

  function handlePartMouseDown(e: React.MouseEvent, partId: string) {
    if (pendingWireStart) return;
    e.stopPropagation();
    if (e.button !== 0) return;

    selectPart(partId);
    if (isSimulating) return;

    const part = parts.find((p) => p.id === partId);
    if (!part) return;

    if (!isBreadboard(part.type)) {
      removeWiresForPart(partId);
    }

    const point = toSvgPoint(e);
    setDrag({ partId, offsetX: point.x - part.x, offsetY: point.y - part.y });
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.button === 1 || (e.button === 0 && !drag && !pendingWireStart)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const point = toSvgPoint(e);
    setCursor(point);

    if (isPanning) {
      let newX = e.clientX - panStart.x;
      let newY = e.clientY - panStart.y;

      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();

        // Calculate maximum pan offsets to prevent dragging past grid edges
        const maxPanX = Math.max(0, (WORLD_WIDTH * effectiveZoom - width) / 2);
        const maxPanY = Math.max(0, (WORLD_HEIGHT * effectiveZoom - height) / 2);

        newX = Math.min(Math.max(newX, -maxPanX), maxPanX);
        newY = Math.min(Math.max(newY, -maxPanY), maxPanY);
      }

      setPanOffset({ x: newX, y: newY });
      return;
    }

    if (drag && !isSimulating) {
      const rawX = point.x - drag.offsetX;
      const rawY = point.y - drag.offsetY;

      // Restrict component movement within grid bounds (50px inner padding)
      const clampedX = Math.min(Math.max(rawX, 50), WORLD_WIDTH - 50);
      const clampedY = Math.min(Math.max(rawY, 50), WORLD_HEIGHT - 50);

      movePart(drag.partId, snapToGrid(clampedX), snapToGrid(clampedY));
    }
  }

  function wireExists(a: PinRef, b: PinRef) {
    return wires.some(
      (w) =>
        (w.from.partId === a.partId && w.from.pinId === a.pinId && w.to.partId === b.partId && w.to.pinId === b.pinId) ||
        (w.from.partId === b.partId && w.from.pinId === b.pinId && w.to.partId === a.partId && w.to.pinId === a.pinId)
    );
  }

  function trySnapToBreadboard(partId: string) {
    const part = parts.find((p) => p.id === partId);
    if (!part || isBreadboard(part.type)) return;

    const breadboards = parts.filter((p) => isBreadboard(p.type));
    if (breadboards.length === 0) return;

    const breadboardPins = breadboards.flatMap((bb) => getResolvedPins(bb));
    const partPins = getResolvedPins(part);

    let best: { pin: (typeof partPins)[number]; target: (typeof breadboardPins)[number]; dist: number } | null = null;
    for (const pin of partPins) {
      for (const target of breadboardPins) {
        const dist = Math.hypot(target.x - pin.x, target.y - pin.y);
        if (dist <= SNAP_DISTANCE && (!best || dist < best.dist)) {
          best = { pin, target, dist };
        }
      }
    }
    if (!best) return;

    const dx = best.target.x - best.pin.x;
    const dy = best.target.y - best.pin.y;
    const newX = snapToGrid(part.x + dx);
    const newY = snapToGrid(part.y + dy);
    movePart(part.id, newX, newY);

    const snappedPins = getResolvedPins({ ...part, x: newX, y: newY });
    for (const pin of snappedPins) {
      for (const target of breadboardPins) {
        if (Math.hypot(target.x - pin.x, target.y - pin.y) < 1) {
          const a: PinRef = { partId: part.id, pinId: pin.pinId };
          const b: PinRef = { partId: target.partId, pinId: target.pinId };
          if (!wireExists(a, b)) connectPins(a, b);
        }
      }
    }
  }

  function handleMouseUp() {
    if (drag && !isSimulating) {
      trySnapToBreadboard(drag.partId);
    }
    setDrag(null);
    setIsPanning(false);
  }

  function handlePinClick(e: React.MouseEvent, partId: string, pinId: string) {
    e.stopPropagation();

    if (isSimulating) return;

    if (pendingWireStart) {
      if (pendingWireStart.partId === partId && pendingWireStart.pinId === pinId) {
        cancelWire();
        return;
      }
      finishWire({ partId, pinId });
    } else {
      startWire({ partId, pinId });
    }
  }

  function handleBackgroundClick(e: React.MouseEvent) {
    if (isPanning) return;

    if (pendingWireStart && cursor) {
      e.stopPropagation();
      const snappedPoint = { x: snapToGrid(cursor.x), y: snapToGrid(cursor.y) };
      addWaypoint(snappedPoint);
      return;
    }

    selectPart(null);
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (pendingWireStart) {
      e.preventDefault();
      cancelWire();
    }
  }

  const selectedPart = parts.find((p) => p.id === selectedPartId);

  let canvasCursor = "grab";
  if (isPanning) canvasCursor = "grabbing";
  else if (pendingWireStart) canvasCursor = "crosshair";
  else if (drag) canvasCursor = "grabbing";

  const breadboardParts = parts.filter((p) => isBreadboard(p.type));
  const otherParts = parts.filter((p) => !isBreadboard(p.type));

  const draftWireData = useMemo(() => {
    if (!pendingWireStart || !cursor) return null;
    const startPart = parts.find((p) => p.id === pendingWireStart.partId);
    if (!startPart) return null;
    const startPin = getResolvedPins(startPart).find((p) => p.pinId === pendingWireStart.pinId);
    if (!startPin) return null;

    return {
      from: { x: startPin.x, y: startPin.y },
      to: cursor,
      waypoints: draftWaypoints,
    };
  }, [pendingWireStart, cursor, parts, draftWaypoints]);

  function renderPart(part: PartInstance) {
    const Component = partComponentRegistry[part.type];
    if (!Component) return null;
    
    const def = partDefinitions[part.type];
    const pinStates: Record<string, ReturnType<typeof netlist.getPinState>> = {};
    if (def) {
      for (const pin of def.pins) {
        pinStates[pin.id] = netlist.getPinState(part.id, pin.id);
      }
    }

    return (
      <g
        key={part.id}
        data-part-id={part.id}
        onMouseDown={(e) => handlePartMouseDown(e, part.id)}
        onClick={(e) => e.stopPropagation()}
        className={isSimulating ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
      >
        <Component
          part={part}
          selected={part.id === selectedPartId}
          onToggle={
            part.type === "pushbutton"
              ? togglePushbutton
              : part.type === "toggle-switch"
              ? toggleSwitch
              : undefined
          }
          pinStates={pinStates}
          netlist={netlist}
          isSimulating={isSimulating}
          onPinClick={(pinId: string, e: React.MouseEvent) => handlePinClick(e, part.id, pinId)}
        />
      </g>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full select-none overflow-hidden relative bg-[#161616]"
      style={{ cursor: canvasCursor }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      <svg
        ref={svgRef}
        className="w-full h-full overflow-hidden block"
        onClick={handleBackgroundClick}
      >
        <defs>
          <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#2a2a2a" />
          </pattern>
        </defs>

        <g
          ref={worldGroupRef}
          transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${effectiveZoom})`}
        >
          <rect
            x={-WORLD_WIDTH / 2}
            y={-WORLD_HEIGHT / 2}
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            fill="url(#grid-dots)"
          />

          <g transform={`translate(${-WORLD_WIDTH / 2}, ${-WORLD_HEIGHT / 2})`}>
            {breadboardParts.map(renderPart)}
            {otherParts.map(renderPart)}

            <WireLayer
              parts={parts}
              wires={wires}
              onDeleteWire={(id) => {
                if (isSimulating) return;
                deleteWire(id);
              }}
              draftWire={draftWireData}
              isSimulating={isSimulating}
            />

            {selectedPart && (
              <PartControlOverlay
                part={selectedPart}
                isSimulating={isSimulating}
                onDelete={() => deletePart(selectedPart.id)}
                onOpenProperties={() => onOpenProperties(selectedPart)}
              />
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}

function PartControlOverlay({ part, isSimulating, onDelete, onOpenProperties }: PartControlOverlayProps) {
  const def = partDefinitions[part.type];
  if (!def) return null;

  const cx = part.x;
  const cy = part.y - (def.heightUnits / 2) * GRID - 20;

  const hasProperties = HAS_MODAL_PROPERTIES_PART.includes(part.type);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isSimulating) return;

    onDelete();
  };

  const handleProperties = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onOpenProperties();
  };

  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <g className="hover:opacity-80 transition-opacity" onMouseDown={handleDelete} onClick={handleDelete}>
        <circle cx={hasProperties ? -14 : 0} cy={0} r={12} fill={isSimulating ? "#52525b" : "#dc2626"} stroke="#ffffff" strokeWidth={1.5} />
        <line
          x1={(hasProperties ? -14 : 0) - 4}
          y1={-4}
          x2={(hasProperties ? -14 : 0) + 4}
          y2={4}
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={(hasProperties ? -14 : 0) + 4}
          y1={-4}
          x2={(hasProperties ? -14 : 0) - 4}
          y2={4}
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <title>
          {isSimulating
            ? "Cannot delete while simulation is running"
            : "Delete part"}
        </title>
      </g>

      {hasProperties && (
        <g className="hover:opacity-80 transition-opacity" onMouseDown={handleProperties} onClick={handleProperties}>
          <circle cx={14} cy={0} r={12} fill="#0284c7" stroke="#ffffff" strokeWidth={1.5} />
          <text x={14} y={4} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold" className="select-none pointer-events-none">
            ⚙
          </text>
          <title>Edit properties</title>
        </g>
      )}
    </g>
  );
}