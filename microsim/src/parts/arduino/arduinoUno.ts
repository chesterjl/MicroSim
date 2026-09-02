import type { ComponentModel } from "../../engine/componentModel";

const MAX_ARDUINO_DIGITAL_PIN = 13;

/**
 * The last "core" special case from the old netlist.ts if-chain. Every
 * digitalWrite()/pinMode() effect in the whole simulation flows through
 * this model: it turns the Arduino's own digitalPins state (set by the
 * AVR CPU emulation in circuitStore.ts) into driven/pulled-up nets that
 * every other part's resolveNetState() then reads.
 */
export const arduinoUnoModel: ComponentModel = {
  sourceVoltage(part, pinId) {
    if (pinId === "5v") return 5;
    if (pinId === "3v3") return 3.3;
    // VIN and anything else fall through to the generic 5V default,
    // matching the old getSourceVoltageForPin()'s catch-all.
    return null;
  },

  drive(part, ctx) {
    for (let i = 0; i <= MAX_ARDUINO_DIGITAL_PIN; i++) {
      const root = ctx.pinRoot(part.id, `d${i}`);
      const state = ctx.digitalPins[i];
      if (state?.mode === "OUTPUT") {
        (state.value === "HIGH" ? ctx.netDrivenHigh : ctx.netDrivenLow).add(root);
      } else if (state?.mode === "INPUT_PULLUP") {
        ctx.netPullup.add(root);
      }
    }
  },
};