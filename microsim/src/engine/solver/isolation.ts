// engine/solver/isolation.ts
import type { PartInstance } from "../../types/types";
import { partDefinitions } from "../../config/partDefinitions";

/**
 * True if `part` shares no electrical node with any OTHER part on the
 * canvas -- i.e. it's just sitting there, not wired (directly or via
 * breadboard contact) to anything else.
 *
 * NOTE: this is a narrower check than isPartFloatingFromReference below.
 * A part seated in an otherwise-unwired breadboard column returns FALSE
 * here (it shares a node with the breadboard part), even though that
 * column leads nowhere electrically. Use isPartFloatingFromReference for
 * "should this part inject a source/branch into the solve" -- this one
 * is only meaningful for "is this part touching literally nothing."
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
 * True if NONE of `part`'s pins sit on a net that reaches a real ground
 * or power reference, using the DIGITAL topology (`pinRoot`, backed by
 * ctx.uf) rather than the separate electrical-branch graph.
 *
 * This deliberately treats resistors/potentiometers/etc as ideal (0ohm)
 * conductors for connectivity purposes -- ctx.uf already shorts a
 * resistor's own two legs digitally (see resistorModel.connect()), so a
 * part wired through any chain of passives, wires, and breadboard columns
 * still resolves correctly here, regardless of which side of it a series
 * resistor happens to sit on.
 *
 * This is the right guard for "should this part inject a voltage source /
 * resistive branch into the MNA solve at all." A component that merely
 * shares a bare breadboard hole with nothing else wired to it still
 * returns true (floating) even though isPartElectricallyIsolated() above
 * would call it "connected" -- it's only touching the breadboard part's
 * pin namespace, not an actual voltage reference. Injecting a source into
 * a genuinely floating loop makes that loop's block of the MNA matrix
 * singular (translation-invariant, no absolute reference), which zeroes
 * out the ENTIRE circuit solve, not just the floating part.
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