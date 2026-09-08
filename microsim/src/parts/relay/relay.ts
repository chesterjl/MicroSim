import type { ComponentModel } from "../../engine/componentModel";

/**
 * Runs in postResolve -- needs ctx.resolveNetState() on its own "in" pin
 * before it can decide which contact to bridge. Safe here specifically
 * because com/no/nc are NOT ground/power-typed pins (see the ordering
 * invariant in types.ts). If a future relay variant's contacts WERE
 * typed power/ground, this would need to move earlier.
 */
export const relayModel: ComponentModel = {
  postResolve(part, ctx) {
    const vccRoot = ctx.pinRoot(part.id, "vcc");
    const gndRoot = ctx.pinRoot(part.id, "gnd");
    const coilPowered = ctx.netPower.has(vccRoot) && ctx.netGround.has(gndRoot);

    const inState = ctx.resolveNetState(ctx.pinRoot(part.id, "in"));
    const activeLow = part.properties?.activeLow !== false;
    const triggered = activeLow ? inState === "LOW" : inState === "HIGH";

    const energized = coilPowered && triggered;
    if (energized) ctx.setFlag("relayEnergized", part.id);

    if (energized) {
      ctx.uf.union(ctx.key(part.id, "com"), ctx.key(part.id, "no"));
    } else {
      ctx.uf.union(ctx.key(part.id, "com"), ctx.key(part.id, "nc"));
    }
  },

  contributeElectricalBranches(part, ctx) {
    const energized = ctx.hasFlag("relayEnergized", part.id);

    if (energized) {
      ctx.addResistiveBranch({
        nodeA: ctx.electricalNodeId!(part.id, "com"),
        nodeB: ctx.electricalNodeId!(part.id, "no"),
        ohms: 0.01,
      });
    } else {
      ctx.addResistiveBranch({
        nodeA: ctx.electricalNodeId!(part.id, "com"),
        nodeB: ctx.electricalNodeId!(part.id, "nc"),
        ohms: 0.01,
      });
    }
  },
};