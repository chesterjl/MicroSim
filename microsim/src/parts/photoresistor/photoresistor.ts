import type { ComponentModel } from "../../engine/componentModel";

export const PHOTORESISTOR_RATED_WATTAGE_DEFAULT = 0.15; // watts -- typical LDR max power dissipation

function photoresistorOhms(lightLevel: number): number {
  const darkOhms = 1_000_000;
  const brightOhms = 100;
  const clamped = Math.max(0, Math.min(1, lightLevel));
  const logDark = Math.log10(darkOhms);
  const logBright = Math.log10(brightOhms);
  const logOhms = logDark + (logBright - logDark) * clamped;
  return Math.round(Math.pow(10, logOhms));
}

export const photoresistorModel: ComponentModel = {
  connect(part, ctx) {
    if (part.properties?.destroyed) return; // burned out -- open circuit, don't short digitally either
    ctx.uf.union(ctx.key(part.id, "pin1"), ctx.key(part.id, "pin2"));
  },

  seriesResistanceContribution(part, roots, ctx) {
    if (part.properties?.destroyed) return 0;
    const pin1Root = ctx.pinRoot(part.id, "pin1");
    if (!roots.has(pin1Root)) return 0;
    const lightLevel = (part.properties?.lightLevel as number) ?? 0.5;
    return photoresistorOhms(lightLevel);
  },

  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return; // open circuit
    const lightLevel = (part.properties?.lightLevel as number) ?? 0.5;
    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "pin1"),
      nodeB: ctx.electricalNodeId!(part.id, "pin2"),
      ohms: photoresistorOhms(lightLevel),
    });
  },

  // Phase 7 
  resolveVoltage(part, ctx) {
    const lightLevel = (part.properties?.lightLevel as number) ?? 0.5;
    const ohms = photoresistorOhms(lightLevel);
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

    const ratedWattage = Number(part.properties?.wattageRating ?? PHOTORESISTOR_RATED_WATTAGE_DEFAULT);
    if (powerWatts > ratedWattage) {
      ctx.setFlag("photoresistorOverloaded", part.id);
    }
  },
};