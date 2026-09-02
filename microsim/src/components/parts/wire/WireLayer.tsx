import { useState } from "react";
import type { PartInstance, Wire } from "../../../types/types";
import { getResolvedPins, buildOrthogonalPath } from "../../../utils/geometry";
import { WireModal } from "./WireModal";

function resolvePinPosition(parts: PartInstance[], partId: string, pinId: string) {
  const part = parts.find((p) => p.id === partId);
  if (!part) return null;
  const resolvedPins = getResolvedPins(part);
  const pin = resolvedPins.find((p: any) => p.pinId === pinId || p.id === pinId);
  return pin ? { x: pin.x, y: pin.y } : null;
}

interface DraftWire {
  from: { x: number; y: number };
  to: { x: number; y: number };
  waypoints: { x: number; y: number }[];
  color?: string;
}

interface WireLayerProps {
  parts: PartInstance[];
  wires: Wire[];
  onDeleteWire: (id: string  ) => void;
  draftWire?: DraftWire | null;
  isSimulating: boolean;
}


export function WireLayer({ parts, wires, onDeleteWire, draftWire, isSimulating }: WireLayerProps) {
  const [selectedWire, setSelectedWire] = useState<Wire | null>(null);
  
  return (
    <>
      <g className="wire-layer">
        {/* Render Saved Wires */}
        {wires.map((wire) => {
          const from = resolvePinPosition(parts, wire.from.partId, wire.from.pinId);
          const to = resolvePinPosition(parts, wire.to.partId, wire.to.pinId);
          if (!from || !to) return null;

          const wireColor = wire.color || "#22c55e";
          const pathD = buildOrthogonalPath(from, to, wire.waypoints || []);

          return (
            <g key={wire.id} className="group">
              {/* Invisible wide stroke for easier clicking */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                onClick={(e) => {
                  e.stopPropagation();

                  if (isSimulating) return;

                  setSelectedWire(wire);
                }}
              />
              {/* Visible wire path */}
              <path
                d={pathD}
                fill="none"
                stroke={wireColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none transition-colors group-hover:stroke-sky-400"
              />
            </g>
          );
        })}

        {/* Live Draft Wire following mouse cursor & waypoints */}
        {draftWire && (
          <path
            d={buildOrthogonalPath(draftWire.from, draftWire.to, draftWire.waypoints)}
            fill="none"
            stroke={draftWire.color || "#22c55e"}
            strokeWidth={3}
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none animate-pulse"
          />
        )}
      </g>

      {/* Wire Configuration Modal */}
      {selectedWire && (
        <WireModal
          wire={selectedWire}
          onClose={() => setSelectedWire(null)}
          onDeleteWire={(id) => {
            onDeleteWire(id);
            setSelectedWire(null);
          }}
        />
      )}
    </>
  );
}