import type { ComponentModel } from "../../engine/componentModel";

/* The buzzer is represented as a resistive load for the electrical solver.
 * Its actual behavior (sounding / overload / destruction) is determined from
 * the solved electrical conditions. */
export const ACTIVE_BUZZER_INTERNAL_OHMS = 180;

export const ACTIVE_BUZZER_RATED_CURRENT_AMPS = 0.03;
export const ACTIVE_BUZZER_MAX_SAFE_CURRENT_AMPS = 0.045;

export const activeBuzzerModel: ComponentModel = {
  /* The buzzer behaves as a resistive load. The electrical solver determines
   * its actual current and voltage. */
  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return;

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "positive"),
      nodeB: ctx.electricalNodeId!(part.id, "negative"),
      ohms: ACTIVE_BUZZER_INTERNAL_OHMS,
    });
  },

  /* Runs AFTER the MNA solve -- this is the only phase where the real
   * current is actually known, so the sound/overload/reversed decision
   * has to live here, not in driveAfterPower (which fires before the
   * electrical branch is even built, and would always see a null
   * reading). */
  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const posVoltage = ctx.getNodeVoltage(part.id, "positive");
    const negVoltage = ctx.getNodeVoltage(part.id, "negative");

    const loopVoltage = posVoltage - negVoltage;
    const currentAmps = Math.abs(loopVoltage) / ACTIVE_BUZZER_INTERNAL_OHMS;

    ctx.setElectricalReading(part.id, {
      loopVoltage,
      totalResistanceOhms: ACTIVE_BUZZER_INTERNAL_OHMS,
      currentAmps,
      forwardVoltageDrop: 0,
    });

    const overloaded = currentAmps > ACTIVE_BUZZER_MAX_SAFE_CURRENT_AMPS;

    if (overloaded) {
      ctx.setFlag("buzzerOverloaded", part.id);
      return; // cooked -- overload always wins over polarity, never sounds
    }

    const posState = ctx.resolveNetState(ctx.pinRoot(part.id, "positive"));
    const negState = ctx.resolveNetState(ctx.pinRoot(part.id, "negative"));

    // Correct polarity + safe current = buzzer sounds.
    if (posState === "HIGH" && negState === "LOW") {
      ctx.setFlag("activeBuzzerSounding", part.id);
      return;
    }

    // Reverse polarity: don't sound.
    if (posState === "LOW" && negState === "HIGH") {
      ctx.setFlag("buzzerReversed", part.id);
    }
  },
};