import type { ComponentModel } from "../../engine/componentModel";

export const uln2003Model: ComponentModel = {
  connect(part, ctx) {
    ctx.uf.union(ctx.key(part.id, "in1"), ctx.key(part.id, "outA"));
    ctx.uf.union(ctx.key(part.id, "in2"), ctx.key(part.id, "outB"));
    ctx.uf.union(ctx.key(part.id, "in3"), ctx.key(part.id, "outC"));
    ctx.uf.union(ctx.key(part.id, "in4"), ctx.key(part.id, "outD"));
    ctx.uf.union(ctx.key(part.id, "vcc"), ctx.key(part.id, "outCOM"));
  },
};