import type { PartInstance, Wire } from "../types/types";
import { getResolvedPins } from "../geometry";

function resolvePinPosition(parts: PartInstance[], partId: string, pinId: string) {
  const part = parts.find((p) => p.id === partId);
  if (!part) return null;
  const resolvedPins = getResolvedPins(part);
  const pin = resolvedPins.find(
    (p: any) => p.pinId === pinId || p.id === pinId
  );
  return pin ? { x: pin.x, y: pin.y } : null;
}

export function WireLayer({
  parts,
  wires,
  onDeleteWire,
}: {
  parts: PartInstance[];
  wires: Wire[];
  onDeleteWire: (id: string) => void;
}) {
  return (
    <g>
      {wires.map((wire) => {
        const from = resolvePinPosition(parts, wire.from.partId, wire.from.pinId);
        const to = resolvePinPosition(parts, wire.to.partId, wire.to.pinId);
        if (!from || !to) return null;

        const midX = (from.x + to.x) / 2;
        const path = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;

        return (
          <path
            key={wire.id}
            d={path}
            fill="none"
            stroke="#2ecc71"
            strokeWidth={3}
            strokeLinecap="round"
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteWire(wire.id);
            }}
          />
        );
      })}
    </g>
  );
}