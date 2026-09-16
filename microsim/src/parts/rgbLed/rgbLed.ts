import type { ComponentModel, SimContext } from "../../engine/componentModel";
import type { PartInstance } from "../../types/types";
import { currentToBrightness, isOvercurrent, MAX_SAFE_CURRENT_AMPS, DEFAULT_LED_RATED_CURRENT_AMPS } from "../../engine/physics/ohmsLaw";
import { isPartFloatingFromReference } from "../../engine/solver/isolation";

const RGB_CHANNEL_FORWARD_VOLTAGE: Record<string, number> = {
  red: 2.0,
  green: 3.0,
  blue: 3.2,
};
const RGB_CHANNEL_SERIES_OHMS = 10.0;
const CHANNELS = ["red", "green", "blue"] as const;
type Channel = (typeof CHANNELS)[number];

/**
 * Groups digitally-active channels by ELECTRICAL node (not the digital
 * uf root). This distinction matters: resistorModel.connect() unions its
 * own pin1/pin2 in the DIGITAL uf (so HIGH/LOW passes through a resistor
 * unimpeded, which is correct for the abstraction) -- so red/green/blue
 * each going through their OWN resistor to a shared rail would incorrectly
 * collapse into one digital uf group even though they're three genuinely
 * separate electrical nodes. buildElectricalGraph() deliberately does NOT
 * short resistor terminals (see electricalGraph.ts), so grouping by
 * ctx.electricalNodeId() here is what correctly tells "channels sharing a
 * bare node with zero resistance between them" (true hogging) apart from
 * "channels each isolated by their own resistor" (fine, mixes normally).
 */
function groupSharedChannels(part: PartInstance, ctx: SimContext): Map<number, Channel[]> {
  const gndState = ctx.resolveNetState(ctx.pinRoot(part.id, "gnd"));
  const active = CHANNELS.filter(
    (ch) => ctx.resolveNetState(ctx.pinRoot(part.id, ch)) === "HIGH" && gndState === "LOW"
  );

  const groups = new Map<number, Channel[]>();
  for (const ch of active) {
    const node = ctx.electricalNodeId!(part.id, ch);
    groups.set(node, [...(groups.get(node) ?? []), ch]);
  }
  return groups;
}

function lowestVfWinner(group: Channel[]): Channel {
  return group.reduce((a, b) => (RGB_CHANNEL_FORWARD_VOLTAGE[a] <= RGB_CHANNEL_FORWARD_VOLTAGE[b] ? a : b));
}

export const rgbLedModel: ComponentModel = {
  contributeElectricalBranches(part, ctx) {
    if (isPartFloatingFromReference(part, ctx.netGround, ctx.netPower, ctx.pinRoot)) return;

    for (const group of groupSharedChannels(part, ctx).values()) {
      const winner = lowestVfWinner(group);

      ctx.addVoltageSource({
        id: `rgbled:${part.id}:${winner}`,
        partId: part.id,
        nodeA: ctx.electricalNodeId!(part.id, winner),
        nodeB: ctx.electricalNodeId!(part.id, "gnd"),
        volts: RGB_CHANNEL_FORWARD_VOLTAGE[winner],
        seriesOhms: RGB_CHANNEL_SERIES_OHMS,
        isJunctionDrop: true,
      });

      if (group.length > 1) ctx.setFlag("rgbLedSharedChannels", part.id);
    }
  },

  resolveVoltage(part, ctx) {
    for (const group of groupSharedChannels(part, ctx).values()) {
      const winner = lowestVfWinner(group);
      const forwardVoltageDrop = RGB_CHANNEL_FORWARD_VOLTAGE[winner];
      const currentAmps = Math.abs(ctx.getSourceCurrent(`rgbled:${part.id}:${winner}`));
      const loopVoltage =
        ctx.getNodeVoltage(part.id, winner) - ctx.getNodeVoltage(part.id, "gnd") + forwardVoltageDrop;
      const totalResistanceOhms = currentAmps > 0 ? loopVoltage / currentAmps : Infinity;

      ctx.setElectricalReading(`${part.id}:${winner}`, {
        loopVoltage,
        totalResistanceOhms,
        currentAmps,
        forwardVoltageDrop,
      });

      if (isOvercurrent(currentAmps, MAX_SAFE_CURRENT_AMPS)) {
        ctx.setFlag(`rgbLedBlown:${winner}`, part.id);
        ctx.setFlag("rgbBlown", part.id);
      }
    }
  },

  getChannelBrightness(part, channel, ctx) {
    if (ctx.hasFlag(`rgbLedBlown:${channel}`, part.id)) return 0;

    const reading = ctx.getElectricalReading(`${part.id}:${channel}`);
    if (!reading || reading.currentAmps <= 0) return 0;

    return currentToBrightness(reading.currentAmps, DEFAULT_LED_RATED_CURRENT_AMPS);
  },
};