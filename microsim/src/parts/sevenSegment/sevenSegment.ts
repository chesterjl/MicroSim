import type { ComponentModel } from "../../engine/componentModel";

export const sevenSegmentModel: ComponentModel = {
  connect(part, ctx) {
    // com1 and com2 are the same physical common pin brought out twice
    // (common-cathode or common-anode, depending on commonType).
    ctx.uf.union(ctx.key(part.id, "com1"), ctx.key(part.id, "com2"));
  },
  
  isSegmentLit(part, segmentId, ctx) {
    const commonType = (part.properties?.commonType as string) ?? "cathode";
    const commonRoot = ctx.pinRoot(part.id, "com1");
    const segRoot = ctx.pinRoot(part.id, segmentId);

    const commonState = ctx.resolveNetState(commonRoot);
    const segState = ctx.resolveNetState(segRoot);

    if (commonType === "cathode") {
      return commonState === "LOW" && segState === "HIGH";
    }
    return commonState === "HIGH" && segState === "LOW";
  },
};