import type { ComponentModel } from "../../engine/componentModel";
import { CAPACITOR_HIGH_THRESHOLD_V } from "../../engine/netlist";

/**
 * Register this SAME object under both "capacitor-polarized" and
 * "capacitor-nonpolarized" -- only the positive-pin id, reverse-bias
 * check, and default voltage rating differ between them.
 *
 * Real electrolytics (polarized) are the dangerous case: they vent/
 * rupture from a small reverse voltage well BEFORE ever reaching their
 * rated voltage backwards -- reverse bias breaks down the internal oxide
 * layer that gives the cap its polarity in the first place. Ceramic caps
 * (non-polarized) don't care about polarity at all, but both types still
 * have a hard voltage ceiling before the dielectric itself breaks down.
 */
const REVERSE_VOLTAGE_TOLERANCE_V = 1.0; // small reverse leakage electrolytics can survive before venting
const DEFAULT_NONPOLARIZED_VOLTAGE_RATING = 50; // typical ceramic disc rating, used only if the part doesn't define its own

export const capacitorModel: ComponentModel = {
  drive(part, ctx) {
    if (part.properties?.destroyed) return; // vented capacitor no longer holds or sources charge

    const isPolarized = part.type === "capacitor-polarized";
    const positivePinId = isPolarized ? "positive" : "pin1";
    const root = ctx.pinRoot(part.id, positivePinId);
    const storedVoltage = Number(part.properties?.storedVoltage ?? 0);

    if (Math.abs(storedVoltage) > 0.05) {
      ctx.netFallbackVoltage.set(root, storedVoltage);
      if (storedVoltage >= CAPACITOR_HIGH_THRESHOLD_V) {
        ctx.netFallbackHigh.add(root);
      }
    }
  },

  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return; // vented capacitor is an open circuit

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
    const approxOhms = Math.abs(storedVoltage) > 4 ? 50 : 100_000;

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, positivePinId),
      nodeB: ctx.electricalNodeId!(part.id, negativePinId),
      ohms: approxOhms,
    });
  },

  /**
   * Phase 8 -- reverse-voltage and overvoltage checks. Reverse bias is
   * ONLY checked for polarized caps (a ceramic has no "wrong way").
   * Overvoltage applies to both, since every real cap has a rated
   * voltage regardless of polarity.
   */
  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const isPolarized = part.type === "capacitor-polarized";
    const voltageRating = Number(
      part.properties?.voltageRating ?? (isPolarized ? 16 : DEFAULT_NONPOLARIZED_VOLTAGE_RATING)
    );
    const storedVoltage = Number(part.properties?.storedVoltage ?? 0);

    if (isPolarized && storedVoltage < -REVERSE_VOLTAGE_TOLERANCE_V) {
      ctx.setFlag("capacitorReversed", part.id);
      return; // reverse bias destroys it well before overvoltage would matter
    }

    if (Math.abs(storedVoltage) > voltageRating) {
      ctx.setFlag("capacitorOverloaded", part.id);
    }
  },
};