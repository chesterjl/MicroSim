// engine/solver/isolation.ts
import type { PartInstance } from "../../types/types";
import { partDefinitions } from "../../config/partDefinitions";

/**
 * True if `part` shares no electrical node with any OTHER part on the
 * canvas -- i.e. it's just sitting there, not wired (directly or via
 * breadboard contact) to anything else. Pass whichever nodeId function
 * matches your current phase (ctx.electricalNodeId inside a component
 * model, or ElectricalGraph.nodeId from the fault detector).
 */
export function isPartElectricallyIsolated(
  part: PartInstance,
  allParts: PartInstance[],
  nodeId: (partId: string, pinId: string) => number
): boolean {
  const def = partDefinitions[part.type];
  if (!def) return true;

  const myNodes = new Set(def.pins.map((pin) => nodeId(part.id, pin.id)));

  for (const other of allParts) {
    if (other.id === part.id) continue;
    const otherDef = partDefinitions[other.type];
    if (!otherDef) continue;
    for (const pin of otherDef.pins) {
      if (myNodes.has(nodeId(other.id, pin.id))) return false;
    }
  }
  return true;
}