import type { ComponentModel } from "../../engine/componentModel";

export const resistorModel: ComponentModel = {
  connect(part, ctx) {
    // A resistor is just a short in this Phase 1 digital model (its
    // resistance value only matters later, when brightness/current gets
    // calculated) -- so its only job here is to union its two pins into
    // the same net.
    ctx.uf.union(ctx.key(part.id, "pin1"), ctx.key(part.id, "pin2"));
  },

  seriesResistanceContribution(part, roots, ctx) {
    const pin1Root = ctx.pinRoot(part.id, "pin1");
    if (!roots.has(pin1Root)) return 0; // connect() already shorted pin1<->pin2

    const rawRes = part.properties?.resistance;
    return typeof rawRes === "number" ? rawRes : parseFloat(String(rawRes)) || 220;
  },

  contributeElectricalBranches(part, ctx) {
    const rawRes = part.properties?.resistance;
    const ohms = typeof rawRes === "number" ? rawRes : parseFloat(String(rawRes)) || 220;
    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "pin1"),
      nodeB: ctx.electricalNodeId!(part.id, "pin2"),
      ohms,
    });
  },
};

