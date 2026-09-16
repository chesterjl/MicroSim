import type { ComponentModel } from "../../engine/componentModel";

/**
 * The 28BYJ-48 has four independent coils (coilA-D), each returning to a
 * shared COM terminal -- NOT one lumped two-terminal load like the DC
 * motor/servo. Overcurrent is checked per-coil so a single shorted or
 * overdriven phase gets flagged even if the other three are fine.
 */
export const STEPPER_COIL_OHMS = 50; // typical 28BYJ-48 per-phase coil resistance
export const STEPPER_COIL_RATED_CURRENT_AMPS = 0.08; // ~80mA per energized coil at 5V rated
export const STEPPER_COIL_MAX_SAFE_CURRENT_AMPS = 0.15; // beyond this, that coil's winding burns out

const COIL_PINS = ["coilA", "coilB", "coilC", "coilD"] as const;

export const stepper28byj48Model: ComponentModel = {
  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return;

    for (const coilPin of COIL_PINS) {
      ctx.addResistiveBranch({
        nodeA: ctx.electricalNodeId!(part.id, coilPin),
        nodeB: ctx.electricalNodeId!(part.id, "com"),
        ohms: STEPPER_COIL_OHMS,
      });
    }
  },

  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const comVoltage = ctx.getNodeVoltage(part.id, "com");
    let worstCurrent = 0;

    for (const coilPin of COIL_PINS) {
      const coilVoltage = ctx.getNodeVoltage(part.id, coilPin);
      const currentAmps = Math.abs(coilVoltage - comVoltage) / STEPPER_COIL_OHMS;
      worstCurrent = Math.max(worstCurrent, currentAmps);
    }

    ctx.setElectricalReading(part.id, {
      loopVoltage: comVoltage,
      totalResistanceOhms: STEPPER_COIL_OHMS,
      currentAmps: worstCurrent,
      forwardVoltageDrop: 0,
    });

    if (worstCurrent > STEPPER_COIL_MAX_SAFE_CURRENT_AMPS) {
      ctx.setFlag("stepperOverloaded", part.id);
    }
  },
};