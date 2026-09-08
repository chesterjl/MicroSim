import { useEffect, useMemo, useRef, useState } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import { buildNetlist } from "../../engine/netlist";
import { getResolvedPins, snapToGrid } from "../../engine/physics/geometry";
import { WireLayer } from "../parts/wire/WireLayer";
import { partDefinitions } from "../../config/partDefinitions";
import { GRID, type PartInstance } from "../../types/types";
import { partComponentRegistry } from "../../parts/partRegistry";
import { WORLD_HEIGHT, WORLD_WIDTH, ZOOM_RENDER_FACTOR } from "../../constants/constant";

const HAS_MODAL_PROPERTIES_PART = ["led", "resistor", "battery", "potentiometer", "ultrasonic-hcsr04", "photoresistor", "seven-segment", "dht11", "dht22", "capacitor-polarized", "capacitor-nonpolarized"];

const SNAP_DISTANCE = 16;

function isBreadboard(type: string) {
  return type.startsWith("breadboard");
}

interface DragState {
  partId: string;
  offsetX: number;
  offsetY: number;
  wasNearBreadboard: boolean;
  riderPartIds: string[];
}

interface CircuitCanvasProps {
  zoomLevel: number;
  panOffset: { x: number; y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isSimulating: boolean;
  onOpenProperties: (part: PartInstance) => void;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
}

interface PartControlOverlayProps {
  part: PartInstance;
  isSimulating: boolean;
  onDelete: () => void;
  onOpenProperties: () => void;
}

export function CircuitCanvas({ zoomLevel, panOffset, setPanOffset, isSimulating, onOpenProperties, setZoomLevel }: CircuitCanvasProps) {
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
  const shiftWireWaypoints = useCircuitStore((s) => s.shiftWireWaypoints);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const effectiveZoom = zoomLevel * ZOOM_RENDER_FACTOR;

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
      const isTyping = activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA" || activeEl?.getAttribute("contenteditable") === "true";

      if (isTyping) return;

      if (!isSimulating && (e.key === "Delete" || e.key === "Backspace") && selectedPartId) deletePart(selectedPartId);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPartId, deletePart, pendingWireStart, cancelWire, isSimulating]);

  useEffect(() => {
    if (isSimulating && pendingWireStart) cancelWire();
  }, [isSimulating, pendingWireStart, cancelWire]);

  function toSvgPoint(e: React.MouseEvent | MouseEvent) {
    const worldGroup = worldGroupRef.current;
    if (!worldGroup) return { x: 0, y: 0 };

    const matrix = worldGroup.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };

    const point = new DOMPoint(e.clientX, e.clientY);
    const localPoint = point.matrixTransform(matrix.inverse());

    return {
      x: localPoint.x + WORLD_WIDTH / 2,
      y: localPoint.y + WORLD_HEIGHT / 2,
    };
  }

  // Used to capture "was this part already on a breadboard" at drag-start, and inside trySnapToBreadboard itself. (pure geometry)
  function findNearestBreadboardPin(part: PartInstance) {
    const breadboards = parts.filter((p) => isBreadboard(p.type));
    if (breadboards.length === 0) return null;

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
    return best;
  }

  const SEATED_EPSILON_PX = 1;

  function findSeatedPartIds(breadboard: PartInstance): string[] {
    const breadboardPins = getResolvedPins(breadboard);

    return parts
      .filter((p) => !isBreadboard(p.type))
      .filter((p) =>
        getResolvedPins(p).some((pin) =>
          breadboardPins.some((bbPin) => Math.hypot(bbPin.x - pin.x, bbPin.y - pin.y) < SEATED_EPSILON_PX)
        )
      )
      .map((p) => p.id);
  }

  function handlePartMouseDown(e: React.MouseEvent, partId: string) {
    if (pendingWireStart) return;
    e.stopPropagation();
    if (e.button !== 0) return;

    selectPart(partId);

    const part = parts.find((p) => p.id === partId);
    if (!part) return;

    if (isSimulating && part.type === "pushbutton") return;
    if (isSimulating) return;

    const wasNearBreadboard = !isBreadboard(part.type) && findNearestBreadboardPin(part) !== null;

    // if we're grabbing a breadboard, snapshot everyone currently seated on it so they can be dragged along with it.
    const riderPartIds = isBreadboard(part.type) ? findSeatedPartIds(part) : [];

    const point = toSvgPoint(e);
    setDrag({ partId, offsetX: point.x - part.x, offsetY: point.y - part.y, wasNearBreadboard, riderPartIds });
  }
  
  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.button === 1 || (e.button === 0 && !drag && !pendingWireStart)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }

  // this now runs UNCONDITIONALLY on every mouse move over the
  // window (see the effect below), not just while drag/pan is active. That's
  // what keeps `cursor` live while the user is mid-wire (pendingWireStart
  // set, but drag/isPanning both false)
  function handleMouseMove(e: React.MouseEvent | MouseEvent) {
    const point = toSvgPoint(e);
    setCursor(point);

    if (isPanning) {
      let newX = e.clientX - panStart.x;
      let newY = e.clientY - panStart.y;

      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
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

      const clampedX = Math.min(Math.max(rawX, 50), WORLD_WIDTH - 50);
      const clampedY = Math.min(Math.max(rawY, 50), WORLD_HEIGHT - 50);

      const snappedX = snapToGrid(clampedX);
      const snappedY = snapToGrid(clampedY);

      const draggedPart = parts.find((p) => p.id === drag.partId);
      if (draggedPart) {
        const dx = snappedX - draggedPart.x;
        const dy = snappedY - draggedPart.y;

        if (dx !== 0 || dy !== 0) {
          shiftWireWaypoints(drag.partId, dx, dy);

          // carry every rider along by the identical delta -- their
          // offset relative to the breadboard never changes, so they stay
          // seated on the exact same holes no matter how far the breadboard travels.
          for (const riderId of drag.riderPartIds) {
            const rider = parts.find((p) => p.id === riderId);
            if (!rider) continue;
            movePart(riderId, rider.x + dx, rider.y + dy);
            shiftWireWaypoints(riderId, dx, dy);
          }
        }
      }

      movePart(drag.partId, snappedX, snappedY);
    }
  }

  function trySnapToBreadboard(partId: string) {
    const part = parts.find((p) => p.id === partId);
    if (!part || isBreadboard(part.type)) return;

    const best = findNearestBreadboardPin(part);

    if (!best) return;

    const dx = best.target.x - best.pin.x;
    const dy = best.target.y - best.pin.y;
    const newX = snapToGrid(part.x + dx);
    const newY = snapToGrid(part.y + dy);
    movePart(part.id, newX, newY);

    // NOTE: no wire creation here on purpose -- breadboard contact is
    // resolved dynamically by geometry inside netlist.ts, not by persisted Wire records.
  }

  // mouseup only re-snaps if the part WASN'T already
  // on a breadboard when this drag started. And it no longer depends on firing from a container mouseleave
  function handleMouseUp() {
    if (drag && !isSimulating && !drag.wasNearBreadboard) trySnapToBreadboard(drag.partId);
    
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

  // mousemove/mouseup are tracked on `window`, unconditionally, for the component's whole lifetime -- not gated behind
  // `drag || isPanning`, and not duplicated on the container. This means:
  //   - wire-drafting cursor tracking works even when nothing is being dragged (fixes bug 1)
  // The container no longer has onMouseMove / onMouseUp / onMouseLeave at
  useEffect(() => {

    function onWindowMove(e: MouseEvent) {
      handleMouseMove(e);
    }
    function onWindowUp() {
      handleMouseUp();
    }

    window.addEventListener("mousemove", onWindowMove);
    window.addEventListener("mouseup", onWindowUp);
    return () => {
      window.removeEventListener("mousemove", onWindowMove);
      window.removeEventListener("mouseup", onWindowUp);
    };
    // Intentionally re-subscribing every render: handleMouseMove/handleMouseUp
    // close over `drag`, `isPanning`, `panStart`, etc., so the listener must
    // always be the freshest version of these closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      if (!container) return;

      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;

      setZoomLevel((prevZoom) => {
        const ZOOM_INTENSITY = 0.0016;
        const nextZoom = Math.min(Math.max(prevZoom * Math.exp(-e.deltaY * ZOOM_INTENSITY), 0.2), 3.0);

        setPanOffset((prevPan) => {
          const ratio = nextZoom / prevZoom;
          return {
            x: cursorX - (cursorX - prevPan.x) * ratio,
            y: cursorY - (cursorY - prevPan.y) * ratio,
          };
        });

        return nextZoom;
      });
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [setZoomLevel, setPanOffset]);

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
      onContextMenu={handleContextMenu}
    >
      <svg ref={svgRef} className="w-full h-full overflow-hidden block" onClick={handleBackgroundClick}>
        <defs>
          <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#2a2a2a" />
          </pattern>
        </defs>

        <g ref={worldGroupRef} transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${effectiveZoom})`}>
          <rect x={-WORLD_WIDTH / 2} y={-WORLD_HEIGHT / 2} width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="url(#grid-dots)" />

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
    <g transform={`translate(${cx}, ${cy})`} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <g className="hover:opacity-80 transition-opacity" onMouseDown={handleDelete} onClick={handleDelete}>
        <circle cx={hasProperties ? -14 : 0} cy={0} r={12} fill={isSimulating ? "#52525b" : "#dc2626"} stroke="#ffffff" strokeWidth={1.5} />
        <line x1={(hasProperties ? -14 : 0) - 4} y1={-4} x2={(hasProperties ? -14 : 0) + 4} y2={4} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
        <line x1={(hasProperties ? -14 : 0) + 4} y1={-4} x2={(hasProperties ? -14 : 0) - 4} y2={4} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
        <title>{isSimulating ? "Cannot delete while simulation is running" : "Delete part"}</title>
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