import type { ComponentModel } from "../../engine/componentModel";

// Logic-level N-channel enhancement-mode MOSFET (e.g. IRLZ44N-class) --
// the common "Arduino pin switches a heavy load" part. Gate draws
// effectively no current in steady state; drain<->source conduct once
// the gate is driven HIGH, same digital-threshold abstraction the NPN
// transistor model uses (see that file's header for why this codebase
// doesn't yet do a true analog Vgs-vs-threshold decision).
const DEFAULT_GATE_THRESHOLD_VOLTAGE = 2; // Vgs(th), printed on the readout/tooltip only
const DEFAULT_RDS_ON_OHMS = 0.05; // on-resistance once fully enhanced
const DEFAULT_MAX_DRAIN_CURRENT_AMPS = 10; // typical logic-level MOSFET rating
const DEFAULT_MAX_DRAIN_SOURCE_VOLTAGE = 55; // Vds rating, checked while OFF
const DEFAULT_MAX_GATE_SOURCE_VOLTAGE = 20; // Vgs rating -- exceeding this cracks the gate oxide, permanently

export const mosfetModel: ComponentModel = {
  // Phase C -- gate state (already resolved digitally) decides whether
  // drain<->source conduct this frame, same pattern transistorNpnModel
  // uses for base->collector/emitter.
  postResolve(part, ctx) {
    if (part.properties?.destroyed) return;

    const gateRoot = ctx.pinRoot(part.id, "gate");
    const gateState = ctx.resolveNetState(gateRoot);
    const isOn = gateState === "HIGH";

    if (isOn) {
      ctx.setFlag("mosfetOn", part.id);
      ctx.uf.union(ctx.key(part.id, "drain"), ctx.key(part.id, "source"));
    }
  },

  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return;

    const isOn = ctx.hasFlag("mosfetOn", part.id);
    const rdsOnOhms = Number(part.properties?.rdsOnOhms ?? DEFAULT_RDS_ON_OHMS);

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "drain"),
      nodeB: ctx.electricalNodeId!(part.id, "source"),
      ohms: isOn ? Math.max(rdsOnOhms, 0.001) : 10_000_000,
    });
  },

  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const isOn = ctx.hasFlag("mosfetOn", part.id);
    const rdsOnOhms = Number(part.properties?.rdsOnOhms ?? DEFAULT_RDS_ON_OHMS);
    const maxDrainCurrentAmps = Number(part.properties?.maxDrainCurrentAmps ?? DEFAULT_MAX_DRAIN_CURRENT_AMPS);
    const maxVds = Number(part.properties?.maxDrainSourceVoltage ?? DEFAULT_MAX_DRAIN_SOURCE_VOLTAGE);
    const maxVgs = Number(part.properties?.maxGateSourceVoltage ?? DEFAULT_MAX_GATE_SOURCE_VOLTAGE);

    const vGate = ctx.getNodeVoltage(part.id, "gate");
    const vSource = ctx.getNodeVoltage(part.id, "source");
    const vDrain = ctx.getNodeVoltage(part.id, "drain");

    // Gate-oxide breakdown -- checked first since it can happen whether
    // the device is "on" or "off", and destroys the gate permanently.
    const vgs = vGate - vSource;
    if (Math.abs(vgs) > maxVgs) {
      ctx.setFlag("mosfetGateBlown", part.id);
      return;
    }

    const vds = Math.abs(vDrain - vSource);

    if (isOn) {
      const drainCurrent = vds / Math.max(rdsOnOhms, 0.001);
      if (drainCurrent > maxDrainCurrentAmps) {
        ctx.setFlag("mosfetOverloaded", part.id);
      }
    } else if (vds > maxVds) {
      ctx.setFlag("mosfetOverloaded", part.id);
    }
  },
};

export { DEFAULT_GATE_THRESHOLD_VOLTAGE };