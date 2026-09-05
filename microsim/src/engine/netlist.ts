import type { PartInstance, Wire } from "../types/types";
import { partDefinitions } from "../config/partDefinitions";
import { getComponentModel } from "./modelRegistry";
import type { SimContext, DigitalPinState } from "./componentModel";

export type NetState = "HIGH" | "LOW" | "FLOATING";

export type { DigitalPinState };

export const CAPACITOR_HIGH_THRESHOLD_V = 2;

function pinKey(partId: string, pinId: string) {
  return `${partId}::${pinId}`;
}

class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export interface Netlist {
  getPinState: (partId: string, pinId: string) => NetState;
  getPartBrightness: (partId: string) => number;
  getRgbChannelBrightness: (partId: string, channel: "red" | "green" | "blue") => number;
  isSevenSegmentLit: (partId: string, segmentId: string) => boolean;
  isRelayEnergized: (partId: string) => boolean;
  isPowered: (partId: string) => boolean;
  isActiveBuzzerSounding: (partId: string) => boolean;
  getAnalogVoltage: (partId: string, pinId: string) => number;
  getConnectedArduinoPin: (partId: string, pinId: string) => number | null;
  arePinsConnected: (partIdA: string, pinIdA: string, partIdB: string, pinIdB: string) => boolean;

  getCapacitorStoredVoltage: (partId: string) => number;
  getExternalSupplyVoltage: (partId: string, pinId: string) => number;
  isNetGrounded: (partId: string, pinId: string) => boolean;
  getLoadResistanceOnNet: (partId: string, pinId: string) => number;

  /** Generic passthrough to whatever a ComponentModel set via ctx.setFlag() -- e.g. "ledReversed", "passiveBuzzerReady", "motorRunningForward". See each model's file for the flag names it sets. */
  hasFlag: (flagName: string, partId: string) => boolean;
}

// NOTE: calculateBrightness and photoresistorOhms used to live here.
// calculateBrightness moved to ./physics/brightness.ts (shared by any
// emitter model). photoresistorOhms moved into photoresistor.ts, since
// it's math specific to that one part.

export function buildNetlist(
  parts: PartInstance[],
  wires: Wire[],
  digitalPins: Record<number, DigitalPinState>,
  isRunning: boolean = false
): Netlist {
  if (!isRunning) {
    return {
      getPinState: () => "FLOATING",
      getPartBrightness: () => 0,
      getRgbChannelBrightness: () => 0,
      isSevenSegmentLit: () => false,
      isRelayEnergized: () => false,
      isPowered: () => false,
      isActiveBuzzerSounding: () => false,
      getAnalogVoltage: () => 0,
      getConnectedArduinoPin: () => null,
      arePinsConnected: () => false,
      getCapacitorStoredVoltage: (partId) => Number(parts.find((p) => p.id === partId)?.properties?.storedVoltage ?? 0),
      getExternalSupplyVoltage: () => 0,
      isNetGrounded: () => false,
      getLoadResistanceOnNet: () => 0,
      hasFlag: () => false,
    };
  }

  const uf = new UnionFind();
  const flags = new Map<string, Set<string>>();

  const netGround = new Set<string>();
  const netPower = new Set<string>();
  const netDrivenHigh = new Set<string>();
  const netDrivenLow = new Set<string>();
  const netPullup = new Set<string>();
  const netVoltageSource = new Map<string, number>();
  const netFallbackVoltage = new Map<string, number>();
  const netFallbackHigh = new Set<string>();
  const netVoltageOverride = new Map<string, number>();

  function resolveNetState(root: string): NetState {
    if (netGround.has(root)) return "LOW";
    if (netDrivenLow.has(root)) return "LOW";
    if (netPower.has(root)) return "HIGH";
    if (netDrivenHigh.has(root)) return "HIGH";
    if (netPullup.has(root)) return "HIGH";
    if (netFallbackHigh.has(root)) return "HIGH";
    return "FLOATING";
  }

  function resolveNetVoltage(root: string): number {
    if (netVoltageOverride.has(root)) return netVoltageOverride.get(root)!;
    if (netGround.has(root)) return 0;
    if (netVoltageSource.has(root)) return netVoltageSource.get(root)!;
    if (netFallbackVoltage.has(root)) return netFallbackVoltage.get(root)!;
    return 0;
  }

  // Generic series-resistance summation -- delegates to each part's own
  // ComponentModel instead of hardcoding resistor/potentiometer/
  // photoresistor here. netlist.ts no longer needs to know which part
  // types are resistive; it just asks. Exposed on ctx so Phase E hooks
  // (getBrightness, getChannelBrightness) can call it too.
  function sumSeriesResistance(roots: Set<string>): number {
    let totalOhms = 0;
    for (const p of parts) {
      const contribution = getComponentModel(p.type)?.seriesResistanceContribution?.(p, roots, ctx);
      if (contribution) totalOhms += contribution;
    }
    return totalOhms;
  }

  const ctx: SimContext = {
    parts,
    wires,
    digitalPins,
    isRunning,
    uf,
    netGround,
    netPower,
    netDrivenHigh,
    netDrivenLow,
    netPullup,
    netVoltageSource,
    netFallbackVoltage,
    netFallbackHigh,
    netVoltageOverride,
    key: pinKey,
    pinRoot: (partId, pinId) => uf.find(pinKey(partId, pinId)),
    resolveNetState: (root) => resolveNetState(root),
    resolveNetVoltage: (root) => resolveNetVoltage(root),
    sumSeriesResistance: (roots) => sumSeriesResistance(roots),
    setFlag: (flagName, partId) => {
      if (!flags.has(flagName)) flags.set(flagName, new Set());
      flags.get(flagName)!.add(partId);
    },
    hasFlag: (flagName, partId) => flags.get(flagName)?.has(partId) ?? false,
  };

  // Seed every part's pins into the union-find so isolated parts still
  // resolve to a stable (self) root.
  for (const part of parts) {
    const def = partDefinitions[part.type];
    if (!def) continue;
    for (const pin of def.pins) uf.find(pinKey(part.id, pin.id));
  }

  for (const wire of wires) {
    uf.union(pinKey(wire.from.partId, wire.from.pinId), pinKey(wire.to.partId, wire.to.pinId));
  }

  // --- Phase A: pure topology unions ---
  for (const part of parts) {
    getComponentModel(part.type)?.connect?.(part, ctx);
  }

  // --- Generic ground/power collection, interleaved with Phase B1 (drive) ---
  for (const part of parts) {
    const def = partDefinitions[part.type];
    if (!def) continue;

    const model = getComponentModel(part.type);

    for (const pin of def.pins) {
      const root = uf.find(pinKey(part.id, pin.id));
      if (pin.type === "ground") netGround.add(root);
      if (pin.type === "power") {
        const isDead = model?.isDeadSource?.(part) ?? false;
        if (!isDead) {
          netPower.add(root);
          const srcVoltage = model?.sourceVoltage?.(part, pin.id) ?? 5;
          netVoltageSource.set(root, srcVoltage);
        }
      }
    }

    model?.drive?.(part, ctx);
  }

  // --- Phase B2 ---
  for (const part of parts) {
    getComponentModel(part.type)?.driveAfterPower?.(part, ctx);
  }

  // --- Phase C: postResolve ---
  for (const part of parts) {
    getComponentModel(part.type)?.postResolve?.(part, ctx);
  }
  
  function isPartPowered(partId: string): boolean {
    const vccRoot = uf.find(pinKey(partId, "vcc"));
    const gndRoot = uf.find(pinKey(partId, "gnd"));
    return netPower.has(vccRoot) && netGround.has(gndRoot);
  }

  // --- Phase D: resolveVoltage ---
  for (const part of parts) {
    getComponentModel(part.type)?.resolveVoltage?.(part, ctx);
  }

  function getConnectedArduinoPinImpl(partId: string, pinId: string): number | null {
    const targetRoot = uf.find(pinKey(partId, pinId));
    for (const part of parts) {
      if (part.type !== "arduino-uno") continue;
      for (let i = 0; i <= 13; i++) {
        if (uf.find(pinKey(part.id, `d${i}`)) === targetRoot) return i;
      }
    }
    return null;
  }

  // --- Phase E: derived behavior queries -- brightness, lit-state, RGB
  // channels. Fully delegated to each part's ComponentModel; netlist.ts
  // no longer contains a single part.type === "..." check in this section. ---
  function calculatePartBrightness(partId: string): number {
    const part = parts.find((p) => p.id === partId);
    if (!part) return 0;
    return getComponentModel(part.type)?.getBrightness?.(part, ctx) ?? 0;
  }

  function calculateRgbChannelBrightness(partId: string, channel: "red" | "green" | "blue"): number {
    const part = parts.find((p) => p.id === partId);
    if (!part) return 0;
    return getComponentModel(part.type)?.getChannelBrightness?.(part, channel, ctx) ?? 0;
  }

  function isSevenSegmentLitImpl(partId: string, segmentId: string): boolean {
    const part = parts.find((p) => p.id === partId);
    if (!part) return false;
    return getComponentModel(part.type)?.isSegmentLit?.(part, segmentId, ctx) ?? false;
  }

  return {
    getPinState: (partId, pinId) => resolveNetState(uf.find(pinKey(partId, pinId))),
    getPartBrightness: (partId) => calculatePartBrightness(partId),
    getRgbChannelBrightness: (partId, channel) => calculateRgbChannelBrightness(partId, channel),
    isSevenSegmentLit: (partId, segmentId) => isSevenSegmentLitImpl(partId, segmentId),
    isRelayEnergized: (partId) => ctx.hasFlag("relayEnergized", partId),
    isPowered: (partId) => isPartPowered(partId),
    isActiveBuzzerSounding: (partId) => ctx.hasFlag("activeBuzzerSounding", partId),
    getAnalogVoltage: (partId, pinId) => resolveNetVoltage(uf.find(pinKey(partId, pinId))),
    getConnectedArduinoPin: (partId, pinId) => getConnectedArduinoPinImpl(partId, pinId),
    arePinsConnected: (partIdA, pinIdA, partIdB, pinIdB) => uf.find(pinKey(partIdA, pinIdA)) === uf.find(pinKey(partIdB, pinIdB)),

    getCapacitorStoredVoltage: (partId) => Number(parts.find((p) => p.id === partId)?.properties?.storedVoltage ?? 0),
    getExternalSupplyVoltage: (partId, pinId) => {
      const root = uf.find(pinKey(partId, pinId));
      return netVoltageSource.get(root) ?? 0;
    },
    isNetGrounded: (partId, pinId) => {
      const root = uf.find(pinKey(partId, pinId));
      return netGround.has(root);
    },
    getLoadResistanceOnNet: (partId, pinId) => {
      const root = uf.find(pinKey(partId, pinId));
      return sumSeriesResistance(new Set([root]));
    },

    hasFlag: (flagName, partId) => ctx.hasFlag(flagName, partId),
  };
}