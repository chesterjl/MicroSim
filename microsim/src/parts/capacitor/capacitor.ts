import type { ComponentModel } from "../../engine/componentModel";
import { CAPACITOR_HIGH_THRESHOLD_V } from "../../engine/netlist";

/**
 * Register this SAME object under both "capacitor-polarized" and
 * "capacitor-nonpolarized" -- only the positive-pin id differs between
 * them. Deliberately writes to netFallbackVoltage, NOT netVoltageSource,
 * so getExternalSupplyVoltage() in circuitStore.ts's RC model can tell
 * "charging from something else" apart from "seeing my own charge."
 */
export const capacitorModel: ComponentModel = {
  drive(part, ctx) {
    const isPolarized = part.type === "capacitor-polarized";
    const positivePinId = isPolarized ? "positive" : "pin1";
    const root = ctx.pinRoot(part.id, positivePinId);
    const storedVoltage = Number(part.properties?.storedVoltage ?? 0);

    if (storedVoltage > 0.05) {
      ctx.netFallbackVoltage.set(root, storedVoltage);
      if (storedVoltage >= CAPACITOR_HIGH_THRESHOLD_V) {
        ctx.netFallbackHigh.add(root);
      }
    }
  },

  contributeElectricalBranches(part, ctx) {
    const isPolarized = part.type === "capacitor-polarized";
    const positivePinId = isPolarized ? "positive" : "pin1";
    const negativePinId = isPolarized ? "negative" : "pin2";

    // Placeholder only -- NOT real capacitor physics. Just prevents this
    // part from being an invisible/floating node in the electrical graph
    // (same bug class as pushbutton/relay above). A charged cap acts
    // like a small resistance to further current in this crude model;
    // an empty one acts closer to open. Real transient RC charging via a
    // backward-Euler companion model is Phase 9 scope, not this pass.
    const storedVoltage = Number(part.properties?.storedVoltage ?? 0);
    const approxOhms = storedVoltage > 4 ? 50 : 100_000;

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, positivePinId),
      nodeB: ctx.electricalNodeId!(part.id, negativePinId),
      ohms: approxOhms,
    });
  },
};