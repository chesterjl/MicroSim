// engine/solver/isolation.ts
import type { PartInstance } from "../../types/types";
import { partDefinitions } from "../../config/partDefinitions";

/* True if `part` shares no electrical node with any OTHER part on the
 * canvas -- i.e. it's just sitting there, not wired (directly or via
 * breadboard contact) to anything else. (This function tells if this part touching literally nothing returns True else False)
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

/**
 * Evaluates whether a part is electrically isolated from system power and ground references.
 *
 * Uses the digital Union-Find topology (`pinRoot`) to treat passive components as ideal conductors.
 * This prevents floating components (those lacking a path to VCC or GND) from injecting voltage
 * sources or resistive branches into the MNA matrix, which would otherwise render the system 
 * matrix singular and break the entire circuit solve.
 *
 * @param part The component instance to check.
 * @param netGround Set of root pin IDs connected to Ground.
 * @param netPower Set of root pin IDs connected to Power/VCC.
 * @param pinRoot Resolver function returning the canonical disjoint-set root for a pin.
 * @returns True if no pins on the component reach a power or ground reference.
 */
export function isPartFloatingFromReference(
  part: PartInstance,
  netGround: Set<string>,
  netPower: Set<string>,
  pinRoot: (partId: string, pinId: string) => string
): boolean {
  const def = partDefinitions[part.type];
  if (!def) return true;

  return !def.pins.some((pin) => {
    const root = pinRoot(part.id, pin.id);
    return netGround.has(root) || netPower.has(root);
  });
}