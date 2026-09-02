import type { ComponentModel } from "../../engine/componentModel";

/**
 * A DC motor has no "correct" polarity the way an LED does -- reversing
 * positive/negative just reverses spin direction, both are valid. So
 * this sets one of two direction flags instead of a single "ready" flag,
 * and sets neither when one terminal is floating (motor at rest).
 */
export const dcGearMotorModel: ComponentModel = {
  driveAfterPower(part, ctx) {
    const posState = ctx.resolveNetState(ctx.pinRoot(part.id, "positive"));
    const negState = ctx.resolveNetState(ctx.pinRoot(part.id, "negative"));

    if (posState === "HIGH" && negState === "LOW") {
      ctx.setFlag("motorRunningForward", part.id);
    } else if (posState === "LOW" && negState === "HIGH") {
      ctx.setFlag("motorRunningReverse", part.id);
    }
  },
};