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
 */

const MAX_ARDUINO_DIGITAL_PIN = 13;

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
    // reversal in case you want to surface a "wired backwards" hint in
    // the UI later (that's Phase 7 fault-detection territory).
    if (positiveGrounded && negativeArduinoPin !== null) {
      ctx.setFlag("passiveBuzzerReady", part.id);
      ctx.setFlag("passiveBuzzerReversed", part.id);
      return;
    }

    // Anything else -- wired straight to a battery/5V rail with no
    // Arduino signal pin involved, not grounded at all, etc. -- is
    // wiring a passive buzzer the way you'd wire an LED. Common mistake,
    // worth flagging.
    ctx.setFlag("passiveBuzzerMiswired", part.id);
  },
};