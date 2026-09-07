import type { ComponentModel } from "../../engine/componentModel";
import {
  calculateCurrentAmps,
  currentToBrightness,
  isOvercurrent,
  MAX_SAFE_CURRENT_AMPS,
  DEFAULT_LED_RATED_CURRENT_AMPS,
} from "../../engine/physics/ohmsLaw";

const RGB_CHANNEL_FORWARD_VOLTAGE: Record<string, number> = {
  red: 2.0,
  green: 3.0,
  blue: 3.2,
};

export const rgbLedModel: ComponentModel = {
  getChannelBrightness(part, channel, ctx) {
    const channelRoot = ctx.pinRoot(part.id, channel);
    const gndRoot = ctx.pinRoot(part.id, "gnd");  

    const loopVoltage = ctx.resolveNetVoltage(channelRoot) - ctx.resolveNetVoltage(gndRoot);
    const forwardVoltageDrop = RGB_CHANNEL_FORWARD_VOLTAGE[channel];

    const totalResistanceOhms = ctx.sumSeriesResistance(new Set([channelRoot]));
    const currentAmps = calculateCurrentAmps(loopVoltage, totalResistanceOhms, forwardVoltageDrop);

    ctx.setElectricalReading(`${part.id}:${channel}`, { loopVoltage, totalResistanceOhms, currentAmps, forwardVoltageDrop });

    if (isOvercurrent(currentAmps, MAX_SAFE_CURRENT_AMPS)) {
      // Flagged per-channel -- the component reads "any channel blown" to
      // decide whether the whole package is treated as destroyed.
      ctx.setFlag(`rgbLedBlown:${channel}`, part.id);
      return 0;
    }

    return currentToBrightness(currentAmps, DEFAULT_LED_RATED_CURRENT_AMPS);
  },
};