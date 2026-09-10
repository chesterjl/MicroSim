// parts/led/led.ts
import type { ComponentModel } from "../../engine/componentModel";
import { LED_FORWARD_VOLTAGE, DEFAULT_LED_FORWARD_VOLTAGE, DEFAULT_LED_RATED_CURRENT_AMPS, MAX_SAFE_CURRENT_AMPS, currentToBrightness, isOvercurrent } from "../../engine/physics/ohmsLaw";
const FORWARD_TOLERANCE = 0.01;

export const ledModel: ComponentModel = {
  driveAfterPower(part, ctx) {
    const anodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "anode"));
    const cathodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "cathode"));
    if (anodeState === "LOW" && cathodeState === "HIGH") ctx.setFlag("ledReversed", part.id);
  },

  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return; // burned-out LED is an open circuit

    const color = ((part.properties?.color as string) ?? "red").toLowerCase();
    const forwardVoltageDrop = LED_FORWARD_VOLTAGE[color] ?? DEFAULT_LED_FORWARD_VOLTAGE;

    ctx.addVoltageSource({
      id: `led:${part.id}`,
      partId: part.id,
      nodeA: ctx.electricalNodeId!(part.id, "anode"),
      nodeB: ctx.electricalNodeId!(part.id, "cathode"),
      volts: forwardVoltageDrop,
      seriesOhms: 10.0,
    });
  },

  /**
   * Phase 7 -- moved out of getBrightness, which only runs when something
   * happens to call netlist.getPartBrightness() for this exact part. This
   * hook always runs once per solve, which is what makes the destructive
   * "ledBlown" latch trustworthy every frame.
   */
  resolveVoltage(part, ctx) {
    const color = ((part.properties?.color as string) ?? "red").toLowerCase();
    const forwardVoltageDrop = LED_FORWARD_VOLTAGE[color] ?? DEFAULT_LED_FORWARD_VOLTAGE;
    const currentAmps = Math.abs(ctx.getSourceCurrent(`led:${part.id}`));

    const anodeVoltage = ctx.getNodeVoltage(part.id, "anode");
    const cathodeVoltage = ctx.getNodeVoltage(part.id, "cathode");
    const actualVoltage = anodeVoltage - cathodeVoltage;
    const forwardBiased = actualVoltage >= forwardVoltageDrop - FORWARD_TOLERANCE;

    const totalResistanceOhms = forwardBiased && currentAmps > 0 ? Math.abs(actualVoltage) / currentAmps : Infinity;

    ctx.setElectricalReading(part.id, {
      loopVoltage: actualVoltage,
      totalResistanceOhms,
      currentAmps: forwardBiased ? currentAmps : 0,
      forwardVoltageDrop,
    });

    if (forwardBiased && isOvercurrent(currentAmps, MAX_SAFE_CURRENT_AMPS)) {
      ctx.setFlag("ledBlown", part.id);
    }
  },

  getBrightness(part, ctx) {
    if (part.properties?.destroyed) return 0;
    if (ctx.hasFlag("ledBlown", part.id)) return 0;

    const reading = ctx.getElectricalReading(part.id);
    if (!reading || reading.currentAmps <= 0) return 0;

    return currentToBrightness(reading.currentAmps, DEFAULT_LED_RATED_CURRENT_AMPS);
  },
};