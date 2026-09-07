import type { ComponentModel } from "../../engine/componentModel";

const MAX_ARDUINO_DIGITAL_PIN = 13;

// Uno's digital I/O logic-high level. A pin driven via analogWrite() at
// duty D behaves, on average, like a source at D * this voltage -- that's
// the entire bridge between Phase 3 (PWM) and Phase 4 (Ohm's law):
// everything downstream (LED/RGB-LED brightness) just reads this net's
// real voltage and does I = V/R like any other source.
const ARDUINO_LOGIC_VOLTAGE = 5;

export const arduinoUnoModel: ComponentModel = {
  sourceVoltage(part, pinId) {
    if (pinId === "5v") return 5;
    if (pinId === "3v3") return 3.3;
    return null;
  },

  drive(part, ctx) {
    for (let i = 0; i <= MAX_ARDUINO_DIGITAL_PIN; i++) {
      const root = ctx.pinRoot(part.id, `d${i}`);
      const state = ctx.digitalPins[i];
      if (state?.mode === "OUTPUT") {
        const duty = state.dutyCycle ?? (state.value === "HIGH" ? 1 : 0);
          
        // Keep the existing binary classification for anything that only
        // cares about digital HIGH/LOW (pin-dot coloring, polarity checks)
        // -- unrelated to the real analog voltage used below.
        (duty >= 0.5 ? ctx.netDrivenHigh : ctx.netDrivenLow).add(root);

        // Real, graded voltage for Ohm's-law consumers (LED/RGB-LED brightness).
        ctx.netVoltageOverride.set(root, duty * ARDUINO_LOGIC_VOLTAGE);
      } else if (state?.mode === "INPUT_PULLUP") {
        ctx.netPullup.add(root);
      }
    }
  },
};