import type { PartInstance, Wire } from "../types/types";
import type { NetState } from "./netlist";
import type { OhmsLawReading } from "./physics/ohmsLaw";
import type { ResistiveBranch, VoltageSourceBranch, CurrentSourceBranch } from "./solver/electricalTypes";

// What an Arduino/digital pin looks like
export interface DigitalPinState {
  mode: "INPUT" | "OUTPUT" | "INPUT_PULLUP";
  value: "HIGH" | "LOW";
  // This lets PWM be represented as an average rather than an arbitrary instantaneous HIGH/LOW state.
  dutyCycle?: number;
}

export interface UnionFindLike {
  find(x: string): string;
  union(a: string, b: string): void;
}

// What the component is allowed to access. This is given for every component.
export interface SimContext {
  parts: PartInstance[];
  wires: Wire[];
  digitalPins: Record<number, DigitalPinState>;
  isRunning: boolean;

  // The Union-Find data
  uf: UnionFindLike;
  netGround: Set<string>;
  netPower: Set<string>;
  netDrivenHigh: Set<string>;
  netDrivenLow: Set<string>;
  netPullup: Set<string>; 
  
  // Voltage maps
  netVoltageSource: Map<string, number>; // root -> volts, REAL sources only (battery, arduino rails)
  netFallbackVoltage: Map<string, number>; // root -> volts, soft sources (capacitors) -- kept OUT of netVoltageSource on purpose
  netFallbackHigh: Set<string>;
  netVoltageOverride: Map<string, number>; // root -> volts, derived (potentiometer wiper, joystick axes)
  
  key(partId: string, pinId: string): string; // Raw union-find key for a pin -- pass to uf.union()/uf.find() directly.
  pinRoot(partId: string, pinId: string): string; // uf.find() shorthand.
  
  resolveNetState(root: string): NetState; // this ask if the net is HIGH, LOW, or FLOATING?
  resolveNetVoltage(root: string): number;  // This is the analog equivalent. Insteead of HIGH, LOW, FLOATING you get 5.0 V, 2.6V or 0V

  // Flags
  /* Generic per-part-id boolean flag bag, e.g. "relayEnergized" -- avoids the Netlist interface growing a bespoke Set for every new component. */
  setFlag(flagName: string, partId: string): void;
  hasFlag(flagName: string, partId: string): boolean;

  /* Sums resistive contributions (resistors, potentiometers, photoresistors,
   * etc.) whose own pin roots intersect `roots`, by delegating to each
   * part's seriesResistanceContribution hook. Used by Phase E hooks
   * (getBrightness / getChannelBrightness) -- meaningful any time after Phase A `connect` unions have run. */
  sumSeriesResistance(roots: Set<string>): number;

  // Electrical readings. These are for things like: Voltage, Current, Resistance, Power 
  setElectricalReading(partId: string, reading: OhmsLawReading): void;
  getElectricalReading(partId: string): OhmsLawReading | null;

  // Phase 5/6 -- pin -> electrical (MNA) node id, separate from the digital `uf` above. 
  // Digital System uses HIGH, LOW, FLOATING and the electrical solver (MNA) use real electrical value e.g 5V, 3.2V, 18mA
  electricalNodeId: ((partId: string, pinId: string) => number) | null;
  addResistiveBranch(branch: ResistiveBranch): void; // Registers one resistive (Ohm's-law) branch between two electrical nodes.
  addVoltageSource(source: VoltageSourceBranch): void; // Registers one ideal voltage source - battery, Arduino rail, or (when conducting) an LED's forward-voltage-drop branch.
  addCurrentSource(source: CurrentSourceBranch): void; // Registers one ideal current source between two electrical nodes -- forces a fixed current regardless of load, the electrical dual of addVoltageSource.
  
  getNodeVoltage(partId: string, pinId: string): number; // Solved node voltage - only meaningful AFTER the MNA solve finishes.
  // Current (amps) through a voltage-source branch, looked up by the `id` passed to `addVoltageSource`. */
  getSourceCurrent(sourceId: string): number;
}

// What a component is allowed | implement to do  
export interface ComponentModel {
  /* Phase A -- pure topology. Union-find merges that depend only on this
   * part's own static properties (a resistor always shorts pin1<->pin2, a
   * pushbutton bridges pins when pressed, etc). Runs for every part BEFORE
   * ground/power pins are collected -- see the invariant above.*/
  connect?(part: PartInstance, ctx: SimContext): void;

  /* Phase B1 -- self-contained drive/source behavior that only reads this
   * part's own state (not other parts' resolved power/ground). Runs once
   * per part, interleaved with the generic ground/power collection pass.
   * Capacitors' fallback voltage and the Arduino's digitalWrite() state
   * live here. */
  drive?(part: PartInstance, ctx: SimContext): void;

  /* Phase B2 -- drive behavior that needs every part's ground/power
   * contribution already collected (e.g. "am I actually powered?"). Runs
   * in a second full pass after B1 completes for all parts. */
  driveAfterPower?(part: PartInstance, ctx: SimContext): void;

  /* Phase C -- runs after ctx.resolveNetState() is meaningful. For parts
   * whose own topology depends on another part's resolved digital state
   * (a relay's coil driving its own contact union). Any union here must
   * avoid touching ground/power-typed pins (see invariant above). */
  postResolve?(part: PartInstance, ctx: SimContext): void;

  /* Phase D -- runs after ctx.resolveNetVoltage() is meaningful. For parts
   * that synthesize a derived analog voltage rather than just being HIGH/
   * LOW/floating (potentiometer wiper, joystick axes). */
  resolveVoltage?(part: PartInstance, ctx: SimContext): void;
  
  contributeElectricalBranches?(part: PartInstance, ctx: SimContext): void;
  /* Used by the generic ground/power collection pass for any pin typed
   * "power" on this part. Return null to fall through to the global
   * default (5V) -- matches the previous getSourceVoltageForPin() default. */
  sourceVoltage?(part: PartInstance, pinId: string): number | null;

  /** Used by the generic pass to skip a "dead" source (e.g. a 0V battery). */
  isDeadSource?(part: PartInstance): boolean;

  /* Phase E -- derived brightness (0..1) for a two-terminal light-emitting
   * part (e.g. LED). Runs after resolveVoltage; ctx.resolveNetState and
   * ctx.sumSeriesResistance are both meaningful here. Return 0 if unlit. */
  getBrightness?(part: PartInstance, ctx: SimContext): number;

  /* Phase E -- derived brightness (0..1) for one named channel of a
   * multi-channel light emitter (e.g. an RGB LED's "red"/"green"/"blue" pins). */
  getChannelBrightness?(part: PartInstance, channel: string, ctx: SimContext): number;

  /* Phase E -- whether a specific named segment/pin of a display-like part
   * is currently lit (e.g. a seven-segment display's "seg_a"). */
  isSegmentLit?(part: PartInstance, segmentId: string, ctx: SimContext): boolean;

  /* Phase E -- ohms this part contributes to a series resistance chain, if
   * any of its own pins' union-find roots fall inside `roots`. Called by
   * the generic ctx.sumSeriesResistance() helper -- return 0/undefined if
   * this part isn't a resistive element on that net. */
  seriesResistanceContribution?(part: PartInstance, roots: Set<string>, ctx: SimContext): number;

  /**
   * Pin pairs that are the SAME physical electrical node regardless of how
   * the part is wired -- e.g. a seven-segment display's com1/com2 are two
   * solder points for one shared pin, not two independently-wireable pins.
   * Consulted by buildElectricalGraph() (NOT ctx.uf/connect()) so the MNA
   * solver treats them as one node even if the user's wire only touches
   * one of the two. Do NOT use this for anything that's only conditionally
   * the same node (a resistor's two legs, a pushbutton's bridged pins when
   * pressed) -- those depend on runtime state and belong in connect()
   * against ctx.uf instead. This is only for pins that are ALWAYS the same
   * physical node by hardware design, independent of wiring or state.
   */
  electricalAliases?(part: PartInstance): Array<[string, string]>;
}