import type { ComponentModel } from "../../engine/componentModel";
import {
  LED_FORWARD_VOLTAGE,
  DEFAULT_LED_FORWARD_VOLTAGE,
  DEFAULT_LED_RATED_CURRENT_AMPS,
  MAX_SAFE_CURRENT_AMPS,
  calculateCurrentAmps,
  currentToBrightness,
  isOvercurrent,
} from "../../engine/physics/ohmsLaw";

export const ledModel: ComponentModel = {
  driveAfterPower(part, ctx) {
    const anodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "anode"));
    const cathodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "cathode"));
    if (anodeState === "LOW" && cathodeState === "HIGH") {
      ctx.setFlag("ledReversed", part.id);
    }
  },

  getBrightness(part, ctx) {
    const anodeRoot = ctx.pinRoot(part.id, "anode");
    const cathodeRoot = ctx.pinRoot(part.id, "cathode");

    const loopVoltage = ctx.resolveNetVoltage(anodeRoot) - ctx.resolveNetVoltage(cathodeRoot);

    const color = ((part.properties?.color as string) ?? "red").toLowerCase();
    const forwardVoltageDrop = LED_FORWARD_VOLTAGE[color] ?? DEFAULT_LED_FORWARD_VOLTAGE;

    const totalResistanceOhms = ctx.sumSeriesResistance(new Set([anodeRoot, cathodeRoot]));
    const currentAmps = calculateCurrentAmps(loopVoltage, totalResistanceOhms, forwardVoltageDrop);

    ctx.setElectricalReading(part.id, { loopVoltage, totalResistanceOhms, currentAmps, forwardVoltageDrop });

    if (isOvercurrent(currentAmps, MAX_SAFE_CURRENT_AMPS)) {
      ctx.setFlag("ledBlown", part.id);
      // A burnt-out junction no longer emits light regardless of how much
      // current the raw math says is flowing -- the LED is dead.
      return 0;
    }

    return currentToBrightness(currentAmps, DEFAULT_LED_RATED_CURRENT_AMPS);
  },
};