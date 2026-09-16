import type { ComponentModel } from "../../engine/componentModel";

/**
 * A DC motor has no "correct" polarity the way an LED does -- reversing
 * positive/negative just reverses spin direction, both are valid.
 *
 * Modeled as a fixed-resistance load (armature + brush resistance) for
 * the electrical solver. This is a deliberately low-fidelity stand-in for
 * a real motor's stall behavior: without back-EMF modeling, current
 * through a small internal resistance at rated voltage already lands in
 * the same ballpark as a real motor's LOCKED-ROTOR current, so treating
 * every frame as "stalled" is a reasonable approximation until back-EMF
 * / speed modeling exists (Phase 13). An overvoltage/overcurrent ceiling
 * on top of that is real and worth enforcing now regardless.
 */
export const DC_GEARMOTOR_INTERNAL_OHMS = 12; // typical small hobby gear-motor armature resistance
export const DC_GEARMOTOR_RATED_CURRENT_AMPS = 0.3; // ~300mA -- normal running current
export const DC_GEARMOTOR_MAX_SAFE_CURRENT_AMPS = 0.6; // beyond this, windings burn out

export const dcGearMotorModel: ComponentModel = {
  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return; // burned-out winding is an open circuit

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "positive"),
      nodeB: ctx.electricalNodeId!(part.id, "negative"),
      ohms: DC_GEARMOTOR_INTERNAL_OHMS,
    });
  },

  // Runs AFTER the MNA solve -- the only phase where currentAmps is real.
  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const posVoltage = ctx.getNodeVoltage(part.id, "positive");
    const negVoltage = ctx.getNodeVoltage(part.id, "negative");
    const loopVoltage = posVoltage - negVoltage;
    const currentAmps = Math.abs(loopVoltage) / DC_GEARMOTOR_INTERNAL_OHMS;

    ctx.setElectricalReading(part.id, {
      loopVoltage,
      totalResistanceOhms: DC_GEARMOTOR_INTERNAL_OHMS,
      currentAmps,
      forwardVoltageDrop: 0,
    });

    if (currentAmps > DC_GEARMOTOR_MAX_SAFE_CURRENT_AMPS) {
      ctx.setFlag("dcMotorOverloaded", part.id);
      return; // cooked -- doesn't spin regardless of polarity
    }
    
    const posState = ctx.resolveNetState(ctx.pinRoot(part.id, "positive"));
    const negState = ctx.resolveNetState(ctx.pinRoot(part.id, "negative"));

    if (posState === "HIGH" && negState === "LOW") {
      ctx.setFlag("motorRunningForward", part.id);
    } else if (posState === "LOW" && negState === "HIGH") {
      ctx.setFlag("motorRunningReverse", part.id);
    }
  },
};