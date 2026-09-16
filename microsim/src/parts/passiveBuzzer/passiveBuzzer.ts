import type { ComponentModel, SimContext } from "../../engine/componentModel";

/**
 * Passive buzzers have no internal oscillator -- unlike an LED or active
 * buzzer, wiring one straight across a static DC source (battery, 5V
 * rail) does nothing on real hardware. It only makes sound when its
 * signal pin is actively toggled by a microcontroller (tone()/PWM). This
 * model does NOT treat "connected to netPower" as valid the way the
 * generic power/ground pass treats most parts -- that's the whole point.
 *
 * It also mirrors real polarity behavior: negative -> GND, positive ->
 * the Arduino's signal pin, same as any other GND-referenced part. This
 * matches what circuitStore.ts's setupPassiveBuzzerDevices already
 * assumes when it resolves a signal pin -- this model just makes that
 * assumption visible/checkable at the netlist layer instead of only
 * failing silently deep in the device setup code.
 *
 * Phase 8 adds the same real-current overload path the active buzzer
 * has. A passive buzzer's piezo/coil element is still a physical load --
 * it doesn't care about polarity, but it DOES care about how much
 * current is forced through it. Wiring it straight to a 9V battery (or
 * any source with no resistor) with the signal pin unused overheats the
 * element exactly the same way, regardless of which lead sits on GND.
 */

const MAX_ARDUINO_DIGITAL_PIN = 13;

export const PASSIVE_BUZZER_INTERNAL_OHMS = 220; // ~23mA @ 5V -- typical piezo/coil element impedance
export const PASSIVE_BUZZER_RATED_CURRENT_AMPS = 0.025; // ~25mA -- normal rated operating current
export const PASSIVE_BUZZER_MAX_SAFE_CURRENT_AMPS = 0.04; // beyond this, the element is destroyed

function findConnectedArduinoDigitalPin(ctx: SimContext, partId: string, pinId: string): number | null {
  const targetRoot = ctx.pinRoot(partId, pinId);
  for (const p of ctx.parts) {
    if (p.type !== "arduino-uno") continue;
    for (let i = 0; i <= MAX_ARDUINO_DIGITAL_PIN; i++) {
      if (ctx.pinRoot(p.id, `d${i}`) === targetRoot) return i;
    }
  }
  return null;
}

export const passiveBuzzerModel: ComponentModel = {
  driveAfterPower(part, ctx) {
    if (part.properties?.destroyed) return;

    const negRoot = ctx.pinRoot(part.id, "negative");
    const posRoot = ctx.pinRoot(part.id, "positive");

    const negativeGrounded = ctx.netGround.has(negRoot);
    const positiveGrounded = ctx.netGround.has(posRoot);
    const positiveArduinoPin = findConnectedArduinoDigitalPin(ctx, part.id, "positive");
    const negativeArduinoPin = findConnectedArduinoDigitalPin(ctx, part.id, "negative");

    // Correct, real-hardware wiring: negative -> GND, positive -> an
    // Arduino digital/PWM pin carrying the toggling signal.
    if (negativeGrounded && positiveArduinoPin !== null) {
      ctx.setFlag("passiveBuzzerReady", part.id);
      return;
    }

    // Reversed: positive -> GND, negative -> the signal pin. A piezo disc
    // doesn't care about polarity the way an LED does, so it would still
    // buzz on real hardware -- flag it as ready, but also flag the
    // reversal in case you want a "wired backwards" hint in the UI
    // later. Not a fault -- it still works, so it's deliberately kept
    // out of the destructive fault registry.
    if (positiveGrounded && negativeArduinoPin !== null) {
      ctx.setFlag("passiveBuzzerReady", part.id);
      ctx.setFlag("passiveBuzzerReversed", part.id);
      return;
    }

    // Anything else -- wired straight to a battery/5V rail with no
    // Arduino signal pin involved, not grounded at all, etc. -- is
    // wiring a passive buzzer the way you'd wire an LED. Common mistake,
    // worth flagging. Note this is purely a "won't make sound" flag --
    // it does NOT mean the electrical branch below is skipped, since
    // current still physically flows through the element either way.
    ctx.setFlag("passiveBuzzerMiswired", part.id);
  },

  /**
   * Phase 8 -- real electrical branch. Modeled as a small fixed
   * resistance between the two terminals, same shape as the active
   * buzzer -- the MNA solver derives actual current from whatever
   * voltage source ends up across it, whether that's a signal pin, a
   * battery, or a straight 5V rail.
   */
  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return; // burned-out element is an open circuit

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "positive"),
      nodeB: ctx.electricalNodeId!(part.id, "negative"),
      ohms: PASSIVE_BUZZER_INTERNAL_OHMS,
    });
  },

  // Phase 8 -- resolve real current/voltage and flag overload. Runs
  // regardless of passiveBuzzerReady/Reversed/Miswired -- overheating
  // doesn't care whether the wiring would have made a sound.
  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const posVoltage = ctx.getNodeVoltage(part.id, "positive");
    const negVoltage = ctx.getNodeVoltage(part.id, "negative");
    const loopVoltage = posVoltage - negVoltage;
    const currentAmps = Math.abs(loopVoltage) / PASSIVE_BUZZER_INTERNAL_OHMS;

    ctx.setElectricalReading(part.id, {
      loopVoltage,
      totalResistanceOhms: PASSIVE_BUZZER_INTERNAL_OHMS,
      currentAmps,
      forwardVoltageDrop: 0,
    });

    if (currentAmps > PASSIVE_BUZZER_MAX_SAFE_CURRENT_AMPS) {
      ctx.setFlag("buzzerOverloaded", part.id);
    }
  },
};