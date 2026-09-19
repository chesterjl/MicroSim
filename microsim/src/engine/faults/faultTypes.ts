// engine/faults/faultTypes.ts
import type { PartInstance } from "../../types/types";

export type FaultSeverity = "warning" | "critical";

export type FaultType =
  | "short-circuit"
  | "conflicting-voltage-sources"
  | "floating-node"
  | "disconnected-component"
  | "no-ground-reference"
  | "invalid-connection"
  | "overloaded-component"
  | "relay-contacts-welded";

export interface Fault {
  type: FaultType;
  severity: FaultSeverity;
  partIds: string[];
  message: string;
  destructive: boolean;
}

export interface FlagFaultDefinition {
  type: FaultType;
  severity: FaultSeverity;
  destructive: boolean;
  /**
   * `hasFlag` lets a definition check OTHER, more granular flags on the
   * same part to build a richer message -- e.g. sevenSegmentMissingResistor
   * uses it to list exactly which segments are affected, while still only
   * registering ONE top-level flag so only one banner ever renders.
   * Existing definitions that don't need this can simply ignore the
   * second parameter.
   */
  message: (part: PartInstance, hasFlag: (flag: string, partId: string) => boolean) => string;
}

// Segment id -> real-world silkscreen label, used only for building the
// sevenSegmentMissingResistor message below. Deliberately NOT imported
// from parts/sevenSegment/sevenSegment.ts -- this registry is allowed to
// know component-specific vocabulary (see rgbLedSharedChannels below),
// but the engine layer shouldn't import from parts/ (wrong direction).
const SEVEN_SEGMENT_LABELS: { id: string; label: string }[] = [
  { id: "seg_a", label: "A" },
  { id: "seg_b", label: "B" },
  { id: "seg_c", label: "C" },
  { id: "seg_d", label: "D" },
  { id: "seg_e", label: "E" },
  { id: "seg_f", label: "F" },
  { id: "seg_g", label: "G" },
  { id: "seg_dp", label: "DP" },
];

export const FLAG_FAULT_REGISTRY: Record<string, FlagFaultDefinition> = {
  ledBlown: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `LED burned out - current exceeded its rated maximum.`,
  },
  
  rgbBlown: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `RGB burned out - current exceeded its rated maximum.`,
  },

  rgbLedSharedChannels: {
    type: "invalid-connection",
    severity: "warning",
    destructive: false,
    message: () =>
      "Red, Green, and Blue share a single resistor node, causing 'current hogging.' " +
      "The lowest forward-voltage channel (Red, ~2.0V) clamps the node, preventing " +
      "Green (~3.0V) and Blue (~3.2V) from turning on. Give each channel its own " +
      "resistor and independent path for voltage source to mix colors properly.",
  },

  resistorOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `Resistor overheated - dissipated power exceeded its rated wattage.`,
  },

  photoresistorOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `Photoresistor overheated - dissipated power exceeded its rated wattage.`,
  },

  potentiometerOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `Potentiometer overheated - dissipated power exceeded its rated wattage.`,
  },

  sevenSegmentBlown: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () =>
      `7-segment display burned out -- every lit segment lacked current limiting and exceeded its rated maximum at once.`,
  },

  sevenSegmentMissingResistor: {  
    type: "invalid-connection",
    severity: "warning",
    destructive: false,
    message: (part, hasFlag) => {
      const affected = SEVEN_SEGMENT_LABELS
        .filter((s) => hasFlag(`sevenSegmentMissingResistor:${s.id}`, part.id))
        .map((s) => s.label);
      const list = affected.length > 0 ? affected.join(", ") : "one or more segments";
      const plural = affected.length > 1;

      return (
        `Segment${plural ? "s" : ""} ${list} missing series resistor -- ` +
        `drawing excessive current directly through internal display resistance.`
      );
    },
  },

  buzzerOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () =>
      `Buzzer burned out - current exceeded its rated maximum. Add a series resistor to limit current.`,
  },

  buzzerReversed: {
    type: "invalid-connection",
    severity: "warning",
    destructive: false,
    message: () =>
      `Buzzer wired with reversed polarity - swap the + and - leads so it can sound safely.`,
  },

  dcMotorOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () =>
      `DC motor burned out - stalled or overvoltaged, drawing far more current than its windings can handle.`,
  },

  servoOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () =>
      `Servo motor burned out - driven beyond its rated voltage, or its horn was blocked and stalled against the load.`,
  },

  stepperOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () =>
      `Stepper motor coil burned out - driven with too much current, either from overvoltage or a jammed rotor.`,
  },

  capacitorReversed: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () =>
      `Electrolytic capacitor wired backwards - reverse voltage breaks down its internal oxide layer, venting or rupturing the can. Check the polarity markings before reconnecting power.`,
  },

  capacitorOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () =>
      `Capacitor exceeded its voltage rating - the dielectric broke down, venting or rupturing the case. Use a capacitor rated for this circuit's voltage.`,
  },

  arduinoPinOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: (part, hasFlag) => {
      const affected: string[] = [];
      for (let i = 0; i <= 13; i++) {
        if (hasFlag(`arduinoPinOverloaded:d${i}`, part.id)) affected.push(`D${i}`);
      }
      const list = affected.length > 0 ? affected.join(", ") : "one or more pins";
      const plural = affected.length > 1;

      return (
        `Digital pin${plural ? "s" : ""} ${list} exceeded max current rating -- ` +
        `Shorted directly to GND or another output without a resistor.`
      );
    },
  },

  relayCoilBurned: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () =>
      "Relay coil burned out from overvoltage -- permanently stuck in resting state (NC) and cannot energize.",
  },  

  relayContactsWelded: {
    type: "relay-contacts-welded",
    severity: "critical",
    destructive: true,
    message: (part) => {
      const state = part.properties?.weldedPosition === "no" ? "energized (NO)" : "resting (NC)";
      return `Relay load current exceeded contact rating -- contacts welded permanently in ${state} position.`;
    },
  },

  inductorOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `Inductor overheated - current through the coil exceeded its rated maximum, melting the windings.`,
  },

  diodeBlown: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `Diode burned out - forward current exceeded its rated maximum. Add a series resistor to limit current.`,
  },

  zenerBlown: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `Zener Diode burned out - forward current exceeded its rated maximum. Add a series resistor to limit current.`,
  },
  
  diodeBreakdown: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `Diode broke down - reverse voltage exceeded its rated maximum, punching through the junction.`,
  },

  transistorOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: (part, hasFlag) =>
      hasFlag("transistorOn", part.id)
        ? `Transistor burned out - collector current exceeded its rated maximum while switched ON.`
        : `Transistor burned out - collector-emitter voltage exceeded its rated maximum while OFF.`,
  },

  powerSupplyCurrentLimiting: {
    type: "invalid-connection",
    severity: "warning",
    destructive: false,
    message: () =>
      `Power supply is in constant-current (CC) mode -- the load is trying to draw more current than the set limit, ` +
      `so the supply is holding output current at the limit instead of the full set voltage. This is normal ` +
      `protective behavior, not damage. Raise the current limit, or reduce the load, to get back to constant-voltage (CV) mode.`,
  },

  mosfetOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: (part, hasFlag) =>
      hasFlag("mosfetOn", part.id)
        ? `MOSFET burned out - drain current exceeded its rated maximum while switched ON. Add a load resistor or check for a short across drain/source.`
        : `MOSFET burned out - drain-source voltage exceeded its rated maximum while OFF.`,
  },

  mosfetGateBlown: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () =>
      `MOSFET gate destroyed - gate-source voltage exceeded its rated maximum, breaking down the gate's insulating oxide layer. ` +
      `The gate is now permanently unusable. Never drive a MOSFET's gate directly from a voltage higher than its Vgs rating.`,
  },
  
};