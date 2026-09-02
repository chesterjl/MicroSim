import type { ComponentModel } from "../../engine/componentModel";

export const sevenSegmentModel: ComponentModel = {
  connect(part, ctx) {
    // com1 and com2 are the same physical common pin brought out twice
    // (common-cathode or common-anode, depending on commonType).
    ctx.uf.union(ctx.key(part.id, "com1"), ctx.key(part.id, "com2"));
  },
};