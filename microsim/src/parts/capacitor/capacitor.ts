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
};