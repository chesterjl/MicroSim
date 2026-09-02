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
};