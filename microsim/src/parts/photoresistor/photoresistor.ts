import type { ComponentModel } from "../../engine/componentModel";

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
    // Same shape as the resistor -- a photoresistor is just a two-pin
    // variable resistor, so in this digital model it's also a short
    // between its two pins. Its light-dependent resistance value only
    // matters later, when brightness gets calculated from lightLevel.
    ctx.uf.union(ctx.key(part.id, "pin1"), ctx.key(part.id, "pin2"));
  },
  seriesResistanceContribution(part, roots, ctx) {
    const pin1Root = ctx.pinRoot(part.id, "pin1");
    if (!roots.has(pin1Root)) return 0;
    const lightLevel = (part.properties?.lightLevel as number) ?? 0.5;
    return photoresistorOhms(lightLevel);
  },
  
  contributeElectricalBranches(part, ctx) {
    const lightLevel = (part.properties?.lightLevel as number) ?? 0.5;
    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "pin1"),
      nodeB: ctx.electricalNodeId!(part.id, "pin2"),
      ohms: photoresistorOhms(lightLevel),
    });
  },
};