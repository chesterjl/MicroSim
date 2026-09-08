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

  contributeElectricalBranches(part, ctx) {
    // Rails only, for now -- modeling each digitalWrite()-driven pin as
    // its own ideal source is real (Phase 8's "DC voltage source" territory
    // once more source types exist); out of scope this pass.
    const gnd = ctx.electricalNodeId!(part.id, "gnd-top");
    ctx.addVoltageSource({ id: `arduino:${part.id}:5v`, nodeA: ctx.electricalNodeId!(part.id, "5v"), nodeB: gnd, volts: 5 });
    ctx.addVoltageSource({ id: `arduino:${part.id}:3v3`, nodeA: ctx.electricalNodeId!(part.id, "3v3"), nodeB: gnd, volts: 3.3 });
  },
};