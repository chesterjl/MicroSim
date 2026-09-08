import type { ComponentModel } from "../../engine/componentModel";

export const pushbuttonModel: ComponentModel = {
  connect(part, ctx) {
    // The two switch pairs are always bridged internally on a real 4-pin
    // tactile button (1<->2 and 3<->4 are permanently joined legs, not
    // the switch contact itself).
    ctx.uf.union(ctx.key(part.id, "pin1"), ctx.key(part.id, "pin2"));
    ctx.uf.union(ctx.key(part.id, "pin3"), ctx.key(part.id, "pin4"));

    // The actual switch contact -- only bridges the two pairs while held.
    if (part.properties?.pressed) {
      ctx.uf.union(ctx.key(part.id, "pin1"), ctx.key(part.id, "pin3"));
    }
  },

  contributeElectricalBranches(part, ctx) {
    // Mirrors connect() above but for the MNA graph: the two switch pairs
    // are always physically joined (near-0Ω), and the actual contact
    // between pairs only closes while pressed. A tiny nonzero resistance
    // (rather than a literal union) keeps this a normal resistive branch
    // for the solver -- true 0Ω shorts are intentionally skipped by
    // mnaSolver.ts, since that's meant for graph-level topology, not a
    // component's own contribution.
    const CLOSED_SWITCH_OHMS = 0.01;

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "pin1"),
      nodeB: ctx.electricalNodeId!(part.id, "pin2"),
      ohms: CLOSED_SWITCH_OHMS,
    });
    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "pin3"),
      nodeB: ctx.electricalNodeId!(part.id, "pin4"),
      ohms: CLOSED_SWITCH_OHMS,
    });

    if (part.properties?.pressed) {
      ctx.addResistiveBranch({
        nodeA: ctx.electricalNodeId!(part.id, "pin1"),
        nodeB: ctx.electricalNodeId!(part.id, "pin3"),
        ohms: CLOSED_SWITCH_OHMS,
      });
    }
  },
};