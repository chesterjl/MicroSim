import type { ComponentModel } from "../../engine/componentModel";

const DEFAULT_FORWARD_VOLTAGE_DROP = 0.7; // silicon rectifier diode (e.g. 1N4001)
const DEFAULT_MAX_REVERSE_VOLTAGE = 50; // typical 1N400x reverse breakdown
const DEFAULT_MAX_FORWARD_CURRENT_AMPS = 1; // typical 1N4001 rating

export const diodeModel: ComponentModel = {
  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return;

    const anodeNode = ctx.electricalNodeId!(part.id, "anode");
    const cathodeNode = ctx.electricalNodeId!(part.id, "cathode");
    const forwardVoltageDrop = Number(part.properties?.forwardVoltageDrop ?? DEFAULT_FORWARD_VOLTAGE_DROP);

    // Cheap pre-solve estimate of direction, same trick used for the LED --
    // digital net state is enough to decide "roughly forward" vs "roughly
    // reverse" before the real MNA solve runs.
    const anodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "anode"));
    const cathodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "cathode"));
    const likelyForward = anodeState === "HIGH" && cathodeState !== "HIGH";

    if (likelyForward) {
      ctx.addVoltageSource({
        id: `diode-junction:${part.id}`,
        partId: part.id,
        nodeA: anodeNode,
        nodeB: cathodeNode,
        volts: forwardVoltageDrop,
        seriesOhms: 1,
        isJunctionDrop: true,
      });
    } else {
      // Reverse-biased (or floating) -- diode blocks, modeled as a very
      // high (but not infinite -- avoids a singular/floating node) resistance.
      ctx.addResistiveBranch({ nodeA: anodeNode, nodeB: cathodeNode, ohms: 10_000_000 });
    }
  },

  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const maxReverseVoltage = Number(part.properties?.maxReverseVoltage ?? DEFAULT_MAX_REVERSE_VOLTAGE);
    const maxForwardCurrentAmps = Number(part.properties?.maxForwardCurrentAmps ?? DEFAULT_MAX_FORWARD_CURRENT_AMPS);

    const vAnode = ctx.getNodeVoltage(part.id, "anode");
    const vCathode = ctx.getNodeVoltage(part.id, "cathode");
    const reverseVoltage = vCathode - vAnode;

    if (reverseVoltage > maxReverseVoltage) {
      ctx.setFlag("diodeBreakdown", part.id);
      return;
    }

    const current = Math.abs(ctx.getSourceCurrent(`diode-junction:${part.id}`));
    if (current > maxForwardCurrentAmps) {
      ctx.setFlag("diodeBlown", part.id);
    }
  },
};