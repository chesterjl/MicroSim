import type { ComponentModel } from "../../engine/componentModel";

export const toggleSwitchModel: ComponentModel = {
  connect(part, ctx) {
    if (part.properties?.on) {
      ctx.uf.union(ctx.key(part.id, "pin1"), ctx.key(part.id, "pin2"));
    }
  },
};