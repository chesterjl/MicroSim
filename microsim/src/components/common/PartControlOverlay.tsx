import { partDefinitions } from "../../config/partDefinitions";
import { GRID, type PartInstance } from "../../types/types";
import { HAS_MODAL_PROPERTIES_PART } from "./ComponentPropertiesModal";

interface PartControlOverlayProps {
  part: PartInstance;
  isSimulating: boolean;
  onDelete: () => void;
  onOpenProperties: () => void;
}

export function PartControlOverlay({ part, isSimulating, onDelete, onOpenProperties }: PartControlOverlayProps) {
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