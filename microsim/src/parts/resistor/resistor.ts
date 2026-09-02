import type { ComponentModel } from "../../engine/componentModel";

export const resistorModel: ComponentModel = {
  connect(part, ctx) {
    // A resistor is just a short in this Phase 1 digital model (its
    // resistance value only matters later, when brightness/current gets
    // calculated) -- so its only job here is to union its two pins into
    // the same net.
    ctx.uf.union(ctx.key(part.id, "pin1"), ctx.key(part.id, "pin2"));
  },
};