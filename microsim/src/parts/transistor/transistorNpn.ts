import type { ComponentModel } from "../../engine/componentModel";

const DEFAULT_SATURATION_OHMS = 5; // Vce(sat) region, low resistance while ON
const DEFAULT_MAX_COLLECTOR_CURRENT_AMPS = 0.5; // e.g. 2N2222-ish
const DEFAULT_MAX_COLLECTOR_EMITTER_VOLTAGE = 40; // Vceo rating while OFF

export const transistorNpnModel: ComponentModel = {
  // Phase C -- base state (already resolved as digital HIGH/LOW) decides
  // whether collector<->emitter conduct this frame, same pattern as a
  // relay's coil driving its own contact union.
  postResolve(part, ctx) {
    if (part.properties?.destroyed) return;

    const baseRoot = ctx.pinRoot(part.id, "base");
    const baseState = ctx.resolveNetState(baseRoot);
    const isOn = baseState === "HIGH";

    if (isOn) {
      ctx.setFlag("transistorOn", part.id);
      ctx.uf.union(ctx.key(part.id, "collector"), ctx.key(part.id, "emitter"));
    }
  },

  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return;

    const isOn = ctx.hasFlag("transistorOn", part.id);
    const saturationOhms = Number(part.properties?.saturationOhms ?? DEFAULT_SATURATION_OHMS);

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "collector"),
      nodeB: ctx.electricalNodeId!(part.id, "emitter"),
      ohms: isOn ? Math.max(saturationOhms, 0.01) : 5_000_000,
    });
  },

  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const isOn = ctx.hasFlag("transistorOn", part.id);
    const saturationOhms = Number(part.properties?.saturationOhms ?? DEFAULT_SATURATION_OHMS);
    const maxCollectorCurrentAmps = Number(part.properties?.maxCollectorCurrentAmps ?? DEFAULT_MAX_COLLECTOR_CURRENT_AMPS);
    const maxVce = Number(part.properties?.maxCollectorEmitterVoltage ?? DEFAULT_MAX_COLLECTOR_EMITTER_VOLTAGE);

    const vCollector = ctx.getNodeVoltage(part.id, "collector");
    const vEmitter = ctx.getNodeVoltage(part.id, "emitter");
    const vce = Math.abs(vCollector - vEmitter);

    if (isOn) {
      const collectorCurrent = vce / Math.max(saturationOhms, 0.01);
      if (collectorCurrent > maxCollectorCurrentAmps) {
        ctx.setFlag("transistorOverloaded", part.id);
      }
    } else if (vce > maxVce) {
      ctx.setFlag("transistorOverloaded", part.id);
    }
  },
};