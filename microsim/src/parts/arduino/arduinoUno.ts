import type { ComponentModel } from "../../engine/componentModel";

const MAX_ARDUINO_DIGITAL_PIN = 13;

// Uno's digital I/O logic-high level. A pin driven via analogWrite() at
// duty D behaves, on average, like a source at D * this voltage -- that's
// the entire bridge between Phase 3 (PWM) and Phase 4 (Ohm's law):
// everything downstream (LED/RGB-LED brightness) just reads this net's
// real voltage and does I = V/R like any other source.
const ARDUINO_LOGIC_VOLTAGE = 5;

/**
 * A real AVR digital pin isn't an ideal voltage source -- it's a small
 * push-pull driver with real output impedance. Modeling that impedance
 * as a series resistance on the pin's own voltage source is what lets
 * the MNA solver naturally derive the huge current that flows when a
 * pin is shorted straight to GND (or to another driven pin) with no
 * resistor: V/R_internal, not V/0.
 */
const ARDUINO_PIN_OUTPUT_OHMS = 25; // typical ATmega328P push-pull driver impedance
export const ARDUINO_PIN_RATED_CURRENT_AMPS = 0.02; // 20mA -- datasheet recommended max per pin
export const ARDUINO_PIN_ABSOLUTE_MAX_CURRENT_AMPS = 0.04; // 40mA -- datasheet absolute max; beyond this the pin degrades/dies

export const arduinoUnoModel: ComponentModel = {
  sourceVoltage(part, pinId) {
    if (pinId === "5v") return 5;
    if (pinId === "3v3") return 3.3;
    return null;
  },

  drive(part, ctx) {
    if (part.properties?.destroyed) return; // bricked -- no rails, no driven pins

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
    if (part.properties?.destroyed) return;

    // Rails, as ideal sources -- no meaningful internal impedance concern
    // for the 5V/3V3 regulator outputs at this fidelity level.
    const gnd = ctx.electricalNodeId!(part.id, "gnd-top");
    ctx.addVoltageSource({ id: `arduino:${part.id}:5v`, nodeA: ctx.electricalNodeId!(part.id, "5v"), nodeB: gnd, volts: 5 });
    ctx.addVoltageSource({ id: `arduino:${part.id}:3v3`, nodeA: ctx.electricalNodeId!(part.id, "3v3"), nodeB: gnd, volts: 3.3 });

    // Every actively-driven digital pin gets its own real source, WITH
    // series resistance -- this is what makes a direct short to GND (or
    // to another driven pin) resolve to a large-but-finite current
    // instead of dividing by zero or silently doing nothing.
    for (let i = 0; i <= MAX_ARDUINO_DIGITAL_PIN; i++) {
      const state = ctx.digitalPins[i];
      if (state?.mode !== "OUTPUT") continue;

      const duty = state.dutyCycle ?? (state.value === "HIGH" ? 1 : 0);
      ctx.addVoltageSource({
        id: `arduino:${part.id}:d${i}`,
        nodeA: ctx.electricalNodeId!(part.id, `d${i}`),
        nodeB: gnd,
        volts: duty * ARDUINO_LOGIC_VOLTAGE,
        seriesOhms: ARDUINO_PIN_OUTPUT_OHMS,
      });
    }
  },

  /**
   * Phase 8 -- per-pin overcurrent check, run after the MNA solve. Any
   * one pin exceeding the absolute max flags both the specific pin (for
   * the fault message's pin list) and the aggregate flag (so the fault
   * registry/UI only needs to look for one banner-triggering name).
   */
  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    for (let i = 0; i <= MAX_ARDUINO_DIGITAL_PIN; i++) {
      const state = ctx.digitalPins[i];
      if (state?.mode !== "OUTPUT") continue;

      const currentAmps = Math.abs(ctx.getSourceCurrent(`arduino:${part.id}:d${i}`));

      ctx.setElectricalReading(`${part.id}:d${i}`, {
        loopVoltage: (state.dutyCycle ?? (state.value === "HIGH" ? 1 : 0)) * ARDUINO_LOGIC_VOLTAGE,
        totalResistanceOhms: ARDUINO_PIN_OUTPUT_OHMS,
        currentAmps,
        forwardVoltageDrop: 0,
      });

      if (currentAmps > ARDUINO_PIN_ABSOLUTE_MAX_CURRENT_AMPS) {
        ctx.setFlag(`arduinoPinOverloaded:d${i}`, part.id);
        ctx.setFlag("arduinoPinOverloaded", part.id);
      }
    }
  },
};