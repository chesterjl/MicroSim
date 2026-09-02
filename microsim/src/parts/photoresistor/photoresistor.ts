import type { ComponentModel } from "../../engine/componentModel";

export const photoresistorModel: ComponentModel = {
  connect(part, ctx) {
    // Same shape as the resistor -- a photoresistor is just a two-pin
    // variable resistor, so in this digital model it's also a short
    // between its two pins. Its light-dependent resistance value only
    // matters later, when brightness gets calculated from lightLevel.
    ctx.uf.union(ctx.key(part.id, "pin1"), ctx.key(part.id, "pin2"));
  },
};