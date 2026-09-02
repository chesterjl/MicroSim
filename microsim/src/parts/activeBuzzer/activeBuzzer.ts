import type { ComponentModel } from "../../engine/componentModel";

/**
 * Active buzzers have their own internal oscillator, unlike a passive
 * buzzer -- any real HIGH/LOW source (battery, 5V rail, an Arduino pin
 * driven HIGH) is valid, no toggling signal required. The only wiring
 * rule is polarity: positive must land on a HIGH net and negative on a
 * LOW net, same shape as an LED's anode/cathode check.
 *
 * This runs in driveAfterPower (not connect) because it needs
 * ctx.resolveNetState(), which only becomes meaningful once every part's
 * power/ground/driven-pin contributions have already been collected in
 * Phase B1.
 */
export const activeBuzzerModel: ComponentModel = {
  driveAfterPower(part, ctx) {
    const posRoot = ctx.pinRoot(part.id, "positive");
    const negRoot = ctx.pinRoot(part.id, "negative");

    const posState = ctx.resolveNetState(posRoot);
    const negState = ctx.resolveNetState(negRoot);

    if (posState === "HIGH" && negState === "LOW") {
      ctx.setFlag("activeBuzzerSounding", part.id);
      return;
    }

    // Wired backwards -- won't sound, but unlike a genuine miswiring
    // (passive buzzer straight to DC) this isn't an invalid circuit, just
    // a swapped connection. Flagged separately in case you want a
    // "reversed" hint in the UI later (Phase 7 fault detection).
    if (posState === "LOW" && negState === "HIGH") {
      ctx.setFlag("activeBuzzerReversed", part.id);
    }
  },
};