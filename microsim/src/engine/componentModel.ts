import type { PartInstance, Wire } from "../types/types";
import type { NetState } from "./netlist";

export interface DigitalPinState {
  mode: "INPUT" | "OUTPUT" | "INPUT_PULLUP";
  value: "HIGH" | "LOW";
}

export interface UnionFindLike {
  find(x: string): string;
  union(a: string, b: string): void;
}

/**
 * Mutable, single-pass state shared by every ComponentModel hook while one
 * buildNetlist() call is in flight.
 *
 * IMPORTANT INVARIANT: netGround / netPower / netDrivenHigh / netDrivenLow /
 * netPullup are keyed by union-find ROOT at the moment they're populated.
 * If a later uf.union() call merges an already-recorded root under a new
 * parent, the Set/Map entry goes stale (uf.find() will return the new
 * parent, but the Set still has the old key). That's why every structural
 * union that touches a ground/power/digital-typed pin MUST happen in the
 * `connect` phase, before the generic ground/power collection pass runs.
 * `postResolve` unions (relay's com->no/nc) are only safe because relay's
 * own pins aren't ground/power typed -- if you add a model whose
 * postResolve union touches a power/ground pin, you will reintroduce this
 * bug. When in doubt, put structural unions in `connect`.
 */
export interface SimContext {
  parts: PartInstance[];
  wires: Wire[];
  digitalPins: Record<number, DigitalPinState>;
  isRunning: boolean;
  uf: UnionFindLike;

  netGround: Set<string>;
  netPower: Set<string>;
  netDrivenHigh: Set<string>;
  netDrivenLow: Set<string>;
  netPullup: Set<string>;
  netVoltageSource: Map<string, number>; // root -> volts, REAL sources only (battery, arduino rails)
  netFallbackVoltage: Map<string, number>; // root -> volts, soft sources (capacitors) -- kept OUT of netVoltageSource on purpose
  netFallbackHigh: Set<string>;
  netVoltageOverride: Map<string, number>; // root -> volts, derived (potentiometer wiper, joystick axes)
  
  /** Raw union-find key for a pin -- pass to uf.union()/uf.find() directly. */
  key(partId: string, pinId: string): string;
  /** uf.find() shorthand. */
  pinRoot(partId: string, pinId: string): string;
  /** Only meaningful once the drive/driveAfterPower phases have run. */
  resolveNetState(root: string): NetState;
  /** Only meaningful once netVoltageOverride is in its final state (resolveVoltage phase and later). */
  resolveNetVoltage(root: string): number;

  /** Generic per-part-id boolean flag bag, e.g. "relayEnergized" -- avoids the Netlist interface growing a bespoke Set for every new component. */
  setFlag(flagName: string, partId: string): void;
  hasFlag(flagName: string, partId: string): boolean;
}

export interface ComponentModel {
  /**
   * Phase A -- pure topology. Union-find merges that depend only on this
   * part's own static properties (a resistor always shorts pin1<->pin2, a
   * pushbutton bridges pins when pressed, etc). Runs for every part BEFORE
   * ground/power pins are collected -- see the invariant above.
   */
  connect?(part: PartInstance, ctx: SimContext): void;

  /**
   * Phase B1 -- self-contained drive/source behavior that only reads this
   * part's own state (not other parts' resolved power/ground). Runs once
   * per part, interleaved with the generic ground/power collection pass.
   * Capacitors' fallback voltage and the Arduino's digitalWrite() state
   * live here.
   */
  drive?(part: PartInstance, ctx: SimContext): void;

  /**
   * Phase B2 -- drive behavior that needs every part's ground/power
   * contribution already collected (e.g. "am I actually powered?"). Runs
   * in a second full pass after B1 completes for all parts.
   */
  driveAfterPower?(part: PartInstance, ctx: SimContext): void;

  /**
   * Phase C -- runs after ctx.resolveNetState() is meaningful. For parts
   * whose own topology depends on another part's resolved digital state
   * (a relay's coil driving its own contact union). Any union here must
   * avoid touching ground/power-typed pins (see invariant above).
   */
  postResolve?(part: PartInstance, ctx: SimContext): void;

  /**
   * Phase D -- runs after ctx.resolveNetVoltage() is meaningful. For parts
   * that synthesize a derived analog voltage rather than just being HIGH/
   * LOW/floating (potentiometer wiper, joystick axes).
   */
  resolveVoltage?(part: PartInstance, ctx: SimContext): void;

  /**
   * Used by the generic ground/power collection pass for any pin typed
   * "power" on this part. Return null to fall through to the global
   * default (5V) -- matches the previous getSourceVoltageForPin() default.
   */
  sourceVoltage?(part: PartInstance, pinId: string): number | null;

  /** Used by the generic pass to skip a "dead" source (e.g. a 0V battery). */
  isDeadSource?(part: PartInstance): boolean;
}