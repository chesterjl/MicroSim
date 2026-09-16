import type { ComponentModel } from "../../engine/componentModel";

/**
 * The servo's own internal DC motor (behind the gear train) is the real
 * current draw -- the signal pin only carries a PWM control line, no
 * meaningful current. Same low-fidelity stall approximation as the DC
 * gear motor: no back-EMF/torque modeling yet, so this only enforces the
 * realistic ceiling (overvoltage, or the horn physically jammed against
 * something and stalling).
 */
export const SERVO_INTERNAL_OHMS = 8; // small coreless/micro-servo motor winding resistance
export const SERVO_RATED_CURRENT_AMPS = 0.15; // ~150mA -- typical no-load/light-load running current
export const SERVO_MAX_SAFE_CURRENT_AMPS = 0.65; // beyond this (rated stall current for an SG90/MG90-class servo), gear motor burns out

export const servoMg90Model: ComponentModel = {
  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return;

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "vcc"),
      nodeB: ctx.electricalNodeId!(part.id, "gnd"),
      ohms: SERVO_INTERNAL_OHMS,
    });
  },

  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const vccVoltage = ctx.getNodeVoltage(part.id, "vcc");
    const gndVoltage = ctx.getNodeVoltage(part.id, "gnd");
    const loopVoltage = vccVoltage - gndVoltage;
    const currentAmps = Math.abs(loopVoltage) / SERVO_INTERNAL_OHMS;

    ctx.setElectricalReading(part.id, {
      loopVoltage,
      totalResistanceOhms: SERVO_INTERNAL_OHMS,
      currentAmps,
      forwardVoltageDrop: 0,
    });

    if (currentAmps > SERVO_MAX_SAFE_CURRENT_AMPS) {
      ctx.setFlag("servoOverloaded", part.id);
    }
  },
};