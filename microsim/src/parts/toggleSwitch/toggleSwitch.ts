import type { ComponentModel } from "../../engine/componentModel";

export const toggleSwitchModel: ComponentModel = {
  connect(part, ctx) {
    if (part.properties?.on) {
      ctx.uf.union(ctx.key(part.id, "pin1"), ctx.key(part.id, "pin2"));
    }
  },

  contributeElectricalBranches(part, ctx) {
    if (!part.properties?.on) return; // open switch -- no branch, solver sees an open circuit, correctly

    // Same reasoning as pushbutton.ts: tiny nonzero resistance represents
    // a closed switch's near-zero contact resistance as a normal
    // resistive branch, rather than a literal 0Ω union the solver would
    // otherwise skip.
    const CLOSED_SWITCH_OHMS = 0.01;

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "pin1"),
      nodeB: ctx.electricalNodeId!(part.id, "pin2"),
      ohms: CLOSED_SWITCH_OHMS,
    });
  },
};