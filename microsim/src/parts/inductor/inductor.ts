
import type { ComponentModel } from "../../engine/componentModel";

// Real inductors are just coils of wire -- their opposition to current
// change is a Phase-9 (transient) concern. Right now they behave as a
// small, fixed DC resistance (the coil's own winding resistance), and
// fail the same way a real one does: too much current overheats/melts

// the windings or saturates the core. There's no polarity to violate.
const DEFAULT_DC_RESISTANCE_OHMS = 2; // typical small coil winding resistance
const DEFAULT_RATED_CURRENT_AMPS = 1; // typical small hobby inductor

export const inductorModel: ComponentModel = {
  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return; // burnt-out coil is open

    const dcResistanceOhms = Number(part.properties?.dcResistanceOhms ?? DEFAULT_DC_RESISTANCE_OHMS);

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "pin1"),
      nodeB: ctx.electricalNodeId!(part.id, "pin2"),
      ohms: Math.max(dcResistanceOhms, 0.01),
    });
  },

  seriesResistanceContribution(part, roots, ctx) {
    if (part.properties?.destroyed) return 0;
    const root = ctx.pinRoot(part.id, "pin1");
    if (!roots.has(root)) return 0;
    return Number(part.properties?.dcResistanceOhms ?? DEFAULT_DC_RESISTANCE_OHMS);
  },

  // Phase E -- overcurrent check, using the real solved node voltages
  // across the coil's own tiny DC resistance to back out real current.
  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const dcResistanceOhms = Number(part.properties?.dcResistanceOhms ?? DEFAULT_DC_RESISTANCE_OHMS);
    const ratedCurrentAmps = Number(part.properties?.ratedCurrentAmps ?? DEFAULT_RATED_CURRENT_AMPS);

    const v1 = ctx.getNodeVoltage(part.id, "pin1");
    const v2 = ctx.getNodeVoltage(part.id, "pin2");
    const currentAmps = Math.abs(v1 - v2) / Math.max(dcResistanceOhms, 0.01);

    // Store the last-seen current for the UI / future transient model.
    if (Math.abs(currentAmps - Number(part.properties?.storedCurrent ?? 0)) > 0.001) {
      part.properties.storedCurrent = currentAmps;
    }

    if (currentAmps > ratedCurrentAmps) {
      ctx.setFlag("inductorOverloaded", part.id);
    }
  },
};