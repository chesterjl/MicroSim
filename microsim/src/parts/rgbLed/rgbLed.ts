import type { ComponentModel } from "../../engine/componentModel";
import { currentToBrightness, isOvercurrent, MAX_SAFE_CURRENT_AMPS, DEFAULT_LED_RATED_CURRENT_AMPS } from "../../engine/physics/ohmsLaw";

const RGB_CHANNEL_FORWARD_VOLTAGE: Record<string, number> = {
  red: 2.0,
  green: 3.0,
  blue: 3.2,
};

export const rgbLedModel: ComponentModel = {
    contributeElectricalBranches(part, ctx) {
    const gndState = ctx.resolveNetState(ctx.pinRoot(part.id, "gnd"));
    for (const channel of ["red", "green", "blue"] as const) {
      const channelState = ctx.resolveNetState(ctx.pinRoot(part.id, channel));
      if (channelState !== "HIGH" || gndState !== "LOW") continue;
      ctx.addVoltageSource({
        id: `rgbled:${part.id}:${channel}`,
        nodeA: ctx.electricalNodeId!(part.id, channel),
        nodeB: ctx.electricalNodeId!(part.id, "gnd"),
        volts: RGB_CHANNEL_FORWARD_VOLTAGE[channel],
      });
    }
  },

  getChannelBrightness(part, channel, ctx) {
    const gndState = ctx.resolveNetState(ctx.pinRoot(part.id, "gnd"));
    const channelState = ctx.resolveNetState(ctx.pinRoot(part.id, channel));
    if (channelState !== "HIGH" || gndState !== "LOW") return 0;

    const forwardVoltageDrop = RGB_CHANNEL_FORWARD_VOLTAGE[channel];
    const currentAmps = Math.abs(ctx.getSourceCurrent(`rgbled:${part.id}:${channel}`));
    const loopVoltage =
      ctx.getNodeVoltage(part.id, channel) - ctx.getNodeVoltage(part.id, "gnd") + forwardVoltageDrop;
    const totalResistanceOhms = currentAmps > 0 ? loopVoltage / currentAmps : Infinity;

    ctx.setElectricalReading(`${part.id}:${channel}`, { loopVoltage, totalResistanceOhms, currentAmps, forwardVoltageDrop });

    if (isOvercurrent(currentAmps, MAX_SAFE_CURRENT_AMPS)) {
      ctx.setFlag(`rgbLedBlown:${channel}`, part.id);
      return 0;
    }

    return currentToBrightness(currentAmps, DEFAULT_LED_RATED_CURRENT_AMPS);
  },
};