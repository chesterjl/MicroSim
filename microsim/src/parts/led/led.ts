import type { ComponentModel } from "../../engine/componentModel";
import { LED_FORWARD_VOLTAGE, DEFAULT_LED_FORWARD_VOLTAGE, DEFAULT_LED_RATED_CURRENT_AMPS, MAX_SAFE_CURRENT_AMPS, currentToBrightness, isOvercurrent} from "../../engine/physics/ohmsLaw";

export const ledModel: ComponentModel = {
  // Digital-only behavior and This is kept separate from the electrical/MNA behavior below.
  driveAfterPower(part, ctx) {
    const anodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "anode"));
    const cathodeState = ctx.resolveNetState(ctx.pinRoot(part.id, "cathode"));

    if (anodeState === "LOW" && cathodeState === "HIGH") ctx.setFlag("ledReversed", part.id);
  },

  /**
   * Electrical/MNA contribution.
   *
   * IMPORTANT:
   * Do NOT use resolveNetState(HIGH/LOW) here to decide whether the LED
   * exists electrically.
   *
   * The digital net resolver and the electrical solver are separate systems.
   * A breadboard-connected LED may have perfectly valid electrical
   * connectivity even when its digital net state is FLOATING or otherwise
   * not classified as HIGH/LOW.
   *
   * The LED is therefore represented as a forward-voltage source with a
   * small internal resistance. The solved current is then used by
   * getBrightness() to determine whether the LED is actually lit.
   */
  contributeElectricalBranches(part, ctx) {
    const color = ((part.properties?.color as string) ?? "red").toLowerCase();

    const forwardVoltageDrop = LED_FORWARD_VOLTAGE[color] ?? DEFAULT_LED_FORWARD_VOLTAGE;
    const anodeNode = ctx.electricalNodeId!(part.id, "anode");
    const cathodeNode = ctx.electricalNodeId!(part.id, "cathode");

    ctx.addVoltageSource({
      id: `led:${part.id}`,
      nodeA: anodeNode,
      nodeB: cathodeNode,
      volts: forwardVoltageDrop,
      seriesOhms: 10.0,
    });
  },

  // Determine LED brightness after the MNA solve.
  getBrightness(part, ctx) {
    const color = ((part.properties?.color as string) ?? "red").toLowerCase();
    const forwardVoltageDrop =LED_FORWARD_VOLTAGE[color] ?? DEFAULT_LED_FORWARD_VOLTAGE;
    const currentAmps = Math.abs(ctx.getSourceCurrent(`led:${part.id}`));

    const anodeVoltage = ctx.getNodeVoltage(part.id, "anode");
    const cathodeVoltage = ctx.getNodeVoltage(part.id, "cathode");

    const actualVoltage = anodeVoltage - cathodeVoltage;

    /* The LED model is directional.
     * If the solved voltage is not forward-biased, don't illuminate it.
     * We intentionally allow a tiny tolerance because the MNA solve uses
     * floating-point arithmetic. */
    const FORWARD_TOLERANCE = 0.01;

    if (actualVoltage < forwardVoltageDrop - FORWARD_TOLERANCE) {
      ctx.setElectricalReading(part.id, {
        loopVoltage: actualVoltage,
        totalResistanceOhms: Infinity,
        currentAmps: 0,
        forwardVoltageDrop,
      });

      return 0;
    }

    const totalResistanceOhms = currentAmps > 0
        ? Math.abs(actualVoltage) / currentAmps
        : Infinity;

    ctx.setElectricalReading(part.id, {
      loopVoltage: actualVoltage,
      totalResistanceOhms,
      currentAmps,
      forwardVoltageDrop,
    });

    // console.log("[LED]", {partId: part.id,anodeVoltage,cathodeVoltage,actualVoltage,currentAmps,currentMA: currentAmps * 1000,});

    // Excessive current means the LED is blown.
    if (isOvercurrent(currentAmps, MAX_SAFE_CURRENT_AMPS)) {
      ctx.setFlag("ledBlown", part.id);
      return 0;
    }

    // No meaningful current means the LED isn't emitting.
    if (currentAmps <= 0) return 0;

    // Else display the led bright based on the current that is flowing
    return currentToBrightness(currentAmps, DEFAULT_LED_RATED_CURRENT_AMPS);
  },
};
