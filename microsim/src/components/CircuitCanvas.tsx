import { useEffect, useMemo, useRef, useState } from "react";
import { useCircuitStore } from "../state/circuitStore";
import { buildNetlist } from "../netlist";
import { getResolvedPins, snapToGrid } from "../geometry";
import { WireLayer } from "../parts/WireLayer";
import { partComponentRegistry } from "../parts/registry";
import { partDefinitions } from "../partDefinitions";
import { GRID, type PartInstance, type PinRef } from "../types/types";

const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 800;

const HAS_PROPERTIES_TYPES = ["led", "resistor", "battery", "potentiometer", "ultrasonic-hcsr04"];

// How close (in SVG px) a component's pin has to land next to a breadboard
// hole on drop before it "plugs in" and auto-wires to it.
// CHANGED: bumped 12 -> 16. The LED's footprint shrank a lot (widthUnits
// 2, heightUnits 3), so its legs are close together and easy to miss the
// old, tighter threshold entirely -- a dropped-but-not-quite-close-enough
// pin just silently never gets a wire, which is exactly what "doesn't
// attach, no green dot" looks like.
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

export function CircuitCanvas({
  zoomLevel,
  panOffset,
  setPanOffset,
  isSimulating,
  onOpenProperties,
}: CircuitCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const parts = useCircuitStore((s) => s.parts);
  const wires = useCircuitStore((s) => s.wires);
  const digitalPins = useCircuitStore((s) => s.digitalPins);
  const selectedPartId = useCircuitStore((s) => s.selectedPartId);
  const pendingWireStart = useCircuitStore((s) => s.pendingWireStart);
  const movePart = useCircuitStore((s) => s.movePart);
  const selectPart = useCircuitStore((s) => s.selectPart);
  const deletePart = useCircuitStore((s) => s.deletePart);
  const startWire = useCircuitStore((s) => s.startWire);
  const finishWire = useCircuitStore((s) => s.finishWire);
  const cancelWire = useCircuitStore((s) => s.cancelWire);
  const deleteWire = useCircuitStore((s) => s.deleteWire);
  const togglePushbutton = useCircuitStore((s) => s.togglePushbutton);
  const connectPins = useCircuitStore((s) => s.connectPins);
  const removeWiresForPart = useCircuitStore((s) => s.removeWiresForPart);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const netlist = useMemo(
    () => buildNetlist(parts, wires, digitalPins, isSimulating),
    [parts, wires, digitalPins, isSimulating]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.getAttribute("contenteditable") === "true";
      if (isTyping) return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedPartId) {
        deletePart(selectedPartId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPartId, deletePart]);

  function toSvgPoint(e: React.MouseEvent | MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = VIEW_WIDTH / rect.width;
    const scaleY = VIEW_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePartMouseDown(e: React.MouseEvent, partId: string) {
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
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (drag && !isSimulating) {
      movePart(drag.partId, snapToGrid(point.x - drag.offsetX), snapToGrid(point.y - drag.offsetY));
    }
  }

  function wireExists(a: PinRef, b: PinRef) {
    return wires.some(
      (w) =>
        (w.from.partId === a.partId && w.from.pinId === a.pinId && w.to.partId === b.partId && w.to.pinId === b.pinId) ||
        (w.from.partId === b.partId && w.from.pinId === b.pinId && w.to.partId === a.partId && w.to.pinId === a.pinId)
    );
  }

  /**
   * Called when a drag ends. If the part that was just dropped has a pin
   * close to a breadboard hole, snap the part so that pin lands exactly on
   * the hole, then wire the two together -- mimics physically plugging a
   * component's leg into a breadboard. If a part STILL doesn't connect
   * after this runs, the most common cause is that its pin geometry in
   * partDefinitions.ts changed since it was placed -- its stored x/y on
   * the canvas doesn't retroactively follow a pin-position edit, so an
   * older instance can end up sitting just outside SNAP_DISTANCE of any
   * real hole. Deleting and re-dragging a fresh copy fixes that.
   */
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

    // Re-resolve pins at the snapped position -- since parts share the same
    // GRID pitch as the breadboard, other legs often land exactly on holes
    // too (e.g. both legs of a resistor), so wire up every exact match.
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

  function handleBackgroundClick() {
    if (isPanning) return;
    selectPart(null);
    if (pendingWireStart) cancelWire();
  }

  const selectedPart = parts.find((p) => p.id === selectedPartId);

  let canvasCursor = "grab";
  if (isPanning) canvasCursor = "grabbing";
  else if (pendingWireStart) canvasCursor = "crosshair";
  else if (drag) canvasCursor = "grabbing";

  const breadboardParts = parts.filter((p) => isBreadboard(p.type));
  const otherParts = parts.filter((p) => !isBreadboard(p.type));

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
          onToggle={part.type === "pushbutton" ? togglePushbutton : undefined}
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
      className="w-full h-full select-none overflow-hidden"
      style={{ cursor: canvasCursor }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="w-full h-full origin-center transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="w-full h-full bg-[#161616]"
          onClick={handleBackgroundClick}
        >
          <defs>
            <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#2a2a2a" />
            </pattern>
          </defs>

          {/* 1. Grid Background */}
          <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#grid-dots)" />

          {/* 2. Breadboards */}
          {breadboardParts.map(renderPart)}

          {/* 3. Other components */}
          {otherParts.map(renderPart)}

          {/* 4. Wiring Layer */}
          <WireLayer parts={parts} wires={wires} onDeleteWire={deleteWire} />

          {/* 5. Pending Wire Preview */}
          {pendingWireStart && cursor && (
            <PendingWirePreview parts={parts} startRef={pendingWireStart} cursor={cursor} />
          )}

          {/* 6. Selected Part Overlays */}
          {selectedPart && (
            <PartControlOverlay
              part={selectedPart}
              onDelete={() => deletePart(selectedPart.id)}
              onOpenProperties={() => onOpenProperties(selectedPart)}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

function PartControlOverlay({
  part,
  onDelete,
  onOpenProperties,
}: {
  part: PartInstance;
  onDelete: () => void;
  onOpenProperties: () => void;
}) {
  const def = partDefinitions[part.type];
  if (!def) return null;

  const cx = part.x;
  const cy = part.y - (def.heightUnits / 2) * GRID - 20;

  const hasProperties = HAS_PROPERTIES_TYPES.includes(part.type);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
      {/* Delete Button */}
      <g className="cursor-pointer hover:opacity-80 transition-opacity" onMouseDown={handleDelete} onClick={handleDelete}>
        <circle cx={hasProperties ? -14 : 0} cy={0} r={12} fill="#dc2626" stroke="#ffffff" strokeWidth={1.5} />
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
        <title>Delete component</title>
      </g>

      {/* Properties Button */}
      {hasProperties && (
        <g className="cursor-pointer hover:opacity-80 transition-opacity" onMouseDown={handleProperties} onClick={handleProperties}>
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

function PendingWirePreview({
  parts,
  startRef,
  cursor,
}: {
  parts: PartInstance[];
  startRef: PinRef;
  cursor: { x: number; y: number };
}) {
  const part = parts.find((p) => p.id === startRef.partId);
  if (!part) return null;

  const pin = getResolvedPins(part).find((p) => p.pinId === startRef.pinId);
  if (!pin) return null;

  return (
    <line
      x1={pin.x}
      y1={pin.y}
      x2={cursor.x}
      y2={cursor.y}
      stroke="#4da3ff"
      strokeWidth={2.5}
      strokeDasharray="4 3"
      className="pointer-events-none"
    />
  );
}