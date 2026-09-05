import type { ComponentModel } from "../../engine/componentModel";
import { calculateBrightness } from "../../engine/physics/brightness";

export const rgbLedModel: ComponentModel = {
  getChannelBrightness(part, channel, ctx) {
    const channelRoot = ctx.pinRoot(part.id, channel);
    const gndRoot = ctx.pinRoot(part.id, "gnd");

    if (ctx.resolveNetState(channelRoot) !== "HIGH" || ctx.resolveNetState(gndRoot) !== "LOW") {
      return 0;
    }

    const totalOhms = ctx.sumSeriesResistance(new Set([channelRoot]));
    return calculateBrightness(totalOhms > 0 ? totalOhms : 220);
  },
};