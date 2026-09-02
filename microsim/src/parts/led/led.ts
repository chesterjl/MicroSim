import type { ComponentModel } from "../../engine/componentModel";

/**
 * LED brightness itself stays centralized in netlist.ts's
 * getPartBrightness (it sums resistance across OTHER parts on the net,
 * genuinely cross-cutting). This model only adds a "wired backwards"
 * flag, matching the pattern set by the buzzer models, so Phase 7 fault
 * detection has one consistent place to check polarity across every
 * part type instead of re-deriving it per component.
 */
export const ledModel: ComponentModel = {
  driveAfterPower(part, ctx) {
    const anodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "anode"));
    const cathodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "cathode"));
    if (anodeState === "LOW" && cathodeState === "HIGH") {
      ctx.setFlag("ledReversed", part.id);
    }
  },
};