import type { ComponentModel } from "../../engine/componentModel";

const DEFAULT_FORWARD_VOLTAGE_DROP = 0.7; // same as a normal diode when forward biased
const DEFAULT_ZENER_VOLTAGE = 5.1; // common E24 value (1N4733A-ish)
const DEFAULT_MAX_POWER_WATTS = 0.5; // typical small-signal Zener (e.g. 1N47xx series)
const DEFAULT_DYNAMIC_RESISTANCE_OHMS = 8; // real Zeners aren't a perfectly flat clamp

const REGULATION_ENGAGE_RATIO = 0.98; // start regulating a hair before the exact rated voltage

function sourceId(partId: string) {
  return `zener-junction:${partId}`;
}

export const zenerDiodeModel: ComponentModel = {
  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return;

    const anodeNode = ctx.electricalNodeId!(part.id, "anode");
    const cathodeNode = ctx.electricalNodeId!(part.id, "cathode");
    const forwardVoltageDrop = Number(part.properties?.forwardVoltageDrop ?? DEFAULT_FORWARD_VOLTAGE_DROP);
    const zenerVoltage = Number(part.properties?.zenerVoltage ?? DEFAULT_ZENER_VOLTAGE);
    const dynamicResistanceOhms = Number(part.properties?.dynamicResistanceOhms ?? DEFAULT_DYNAMIC_RESISTANCE_OHMS);

    const anodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "anode"));
    const cathodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "cathode"));
    const likelyForward = anodeState === "HIGH" && cathodeState !== "HIGH";

    if (likelyForward) {
      // Forward-biased: behaves exactly like a normal diode's junction drop.
      ctx.addVoltageSource({
        id: sourceId(part.id),
        partId: part.id,
        nodeA: anodeNode,
        nodeB: cathodeNode,
        volts: forwardVoltageDrop,
        seriesOhms: 1,
        isJunctionDrop: true,
      });
      return;
    }

    // Reverse-biased (or floating): decide block vs. regulate using LAST
    // frame's measured reverse voltage -- the same one-frame-delayed
    // feedback trick capacitorModel/powerSupplyModel already use, since
    // there's no iterative nonlinear solver yet (Phase 6+ scope). At 60
    // solves/second this settles indistinguishably fast in practice.
    const lastReverseVoltage = Number(part.properties?.lastReverseVoltage ?? 0);

    if (lastReverseVoltage >= zenerVoltage * REGULATION_ENGAGE_RATIO) {
      // Breakdown region -- the Zener clamps the reverse voltage at its
      // rated value. Modeled as a reverse-oriented source (cathode is the
      // higher-potential terminal here) with a small dynamic resistance,
      // NOT a hard short -- a real Zener's clamp isn't perfectly flat.
      ctx.addVoltageSource({
        id: sourceId(part.id),
        partId: part.id,
        nodeA: cathodeNode,
        nodeB: anodeNode,
        volts: zenerVoltage,
        seriesOhms: Math.max(dynamicResistanceOhms, 0.1),
        isJunctionDrop: true,
      });
    } else {
      // Below breakdown -- blocks, same high-resistance model a normal
      // diode uses when reverse biased.
      ctx.addResistiveBranch({ nodeA: anodeNode, nodeB: cathodeNode, ohms: 10_000_000 });
    }
  },

  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const zenerVoltage = Number(part.properties?.zenerVoltage ?? DEFAULT_ZENER_VOLTAGE);
    const maxPowerWatts = Number(part.properties?.maxPowerWatts ?? DEFAULT_MAX_POWER_WATTS);

    const vAnode = ctx.getNodeVoltage(part.id, "anode");
    const vCathode = ctx.getNodeVoltage(part.id, "cathode");
    const reverseVoltage = vCathode - vAnode;

    // Persisted purely so NEXT frame's contributeElectricalBranches can
    // react to it -- see the comment above.
    part.properties.lastReverseVoltage = reverseVoltage;

    const isRegulating = reverseVoltage >= zenerVoltage * REGULATION_ENGAGE_RATIO;
    if (isRegulating) {
      ctx.setFlag("zenerRegulating", part.id);
    }

    const current = Math.abs(ctx.getSourceCurrent(sourceId(part.id)));
    const effectiveVoltage = isRegulating ? zenerVoltage : Number(part.properties?.forwardVoltageDrop ?? DEFAULT_FORWARD_VOLTAGE_DROP);
    const powerWatts = current * effectiveVoltage;

    if (powerWatts > maxPowerWatts) {
      ctx.setFlag("zenerBlown", part.id);
    }
  },
};