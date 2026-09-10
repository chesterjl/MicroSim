// parts/resistor/resistor.ts
import type { ComponentModel } from "../../engine/componentModel";

export const RESISTOR_RATED_WATTAGE_DEFAULT = 0.25; // watts -- standard 1/4W through-hole resistor

function getOhms(part: { properties?: Record<string, unknown> }): number {
  const rawRes = part.properties?.resistance;
  return typeof rawRes === "number" ? rawRes : parseFloat(String(rawRes)) || 220;
}

export const resistorModel: ComponentModel = {
  connect(part, ctx) {
    if (part.properties?.destroyed) return; // burned out -- open circuit, don't short digitally either
    ctx.uf.union(ctx.key(part.id, "pin1"), ctx.key(part.id, "pin2"));
  },

  seriesResistanceContribution(part, roots, ctx) {
    if (part.properties?.destroyed) return 0;
    const pin1Root = ctx.pinRoot(part.id, "pin1");
    if (!roots.has(pin1Root)) return 0;
    return getOhms(part);
  },

  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return; // open circuit
    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "pin1"),
      nodeB: ctx.electricalNodeId!(part.id, "pin2"),
      ohms: getOhms(part),
    });
  },
  
  // Phase 7
  resolveVoltage(part, ctx) {
    const ohms = getOhms(part);
    const v1 = ctx.getNodeVoltage(part.id, "pin1");
    const v2 = ctx.getNodeVoltage(part.id, "pin2");
    const deltaV = v1 - v2;
    const currentAmps = Math.abs(deltaV) / Math.max(ohms, 1e-6);
    const powerWatts = currentAmps * currentAmps * ohms;

    ctx.setElectricalReading(part.id, {
      loopVoltage: deltaV,
      totalResistanceOhms: ohms,
      currentAmps,
      forwardVoltageDrop: 0,
    });

    const ratedWattage = Number(part.properties?.wattageRating ?? RESISTOR_RATED_WATTAGE_DEFAULT);
    if (powerWatts > ratedWattage) {
      ctx.setFlag("resistorOverloaded", part.id);
    }
  },
};