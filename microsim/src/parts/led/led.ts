import type { ComponentModel } from "../../engine/componentModel";
import { calculateBrightness } from "../../engine/physics/brightness";

export const ledModel: ComponentModel = {
  driveAfterPower(part, ctx) {
    const anodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "anode"));
    const cathodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "cathode"));
    if (anodeState === "LOW" && cathodeState === "HIGH") {
      ctx.setFlag("ledReversed", part.id);
    }
  },
  getBrightness(part, ctx) {
    const anodeRoot = ctx.pinRoot(part.id, "anode");
    const cathodeRoot = ctx.pinRoot(part.id, "cathode");

    if (ctx.resolveNetState(anodeRoot) !== "HIGH" || ctx.resolveNetState(cathodeRoot) !== "LOW") {
      return 0;
    }

    const totalOhms = ctx.sumSeriesResistance(new Set([anodeRoot, cathodeRoot]));
    return calculateBrightness(totalOhms > 0 ? totalOhms : 220);
  },
};