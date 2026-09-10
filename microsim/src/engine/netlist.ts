// engine/netlist.ts
import type { PartInstance, Wire } from "../types/types";
import { partDefinitions } from "../config/partDefinitions";
import { getComponentModel } from "./modelRegistry";
import type { SimContext, DigitalPinState } from "./componentModel";
import { getResolvedPins } from "./physics/geometry";
import type { OhmsLawReading } from "./physics/ohmsLaw";
import { UnionFind } from "./unionFind";
import { BREADBOARD_CONTACT_EPSILON_PX, buildElectricalGraph, type ElectricalGraph } from "./solver/electricalGraph";
import type { CircuitSolution, ResistiveBranch, VoltageSourceBranch } from "./solver/electricalTypes";
import { solveCircuit } from "./solver/mnaSolver";
import { detectFaults } from "./faults/faultDetector";
import type { Fault } from "./faults/faultTypes";

export type { Fault } from "./faults/faultTypes";
export type NetState = "HIGH" | "LOW" | "FLOATING";
export type { DigitalPinState };

export const CAPACITOR_HIGH_THRESHOLD_V = 2;

function pinKey(partId: string, pinId: string) {
  return `${partId}::${pinId}`;
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
  getElectricalReading: (partId: string) => OhmsLawReading | null;

  getNodeVoltage: (partId: string, pinId: string) => number;
  getSourceCurrent: (sourceId: string) => number;
  hasFlag: (flagName: string, partId: string) => boolean;

  /** Phase 7 -- every fault detected on this solve, both component-local (flag-based) and whole-circuit (topology-based). Empty while paused. */
  getFaults: () => Fault[];
}

export function buildNetlist(
  parts: PartInstance[],
  wires: Wire[],
  digitalPins: Record<number, DigitalPinState>,
  isRunning: boolean = false
): Netlist {
  const uf = new UnionFind();
  const electricalReadings = new Map<string, OhmsLawReading>();
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

  function sumSeriesResistance(roots: Set<string>): number {
    let totalOhms = 0;
    for (const p of parts) {
      const contribution = getComponentModel(p.type)?.seriesResistanceContribution?.(p, roots, ctx);
      if (contribution) totalOhms += contribution;
    }
    return totalOhms;
  }

  let electricalGraphRef: ElectricalGraph | null = null;
  let circuitSolution: CircuitSolution | null = null;
  let faultsRef: Fault[] = [];
  const electricalBranches: ResistiveBranch[] = [];
  const electricalSources: VoltageSourceBranch[] = [];

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
    setElectricalReading: (partId, reading) => electricalReadings.set(partId, reading),
    getElectricalReading: (partId) => electricalReadings.get(partId) ?? null,
    electricalNodeId: (partId, pinId) => (electricalGraphRef ? electricalGraphRef.nodeId(partId, pinId) : 0),
    addResistiveBranch: (branch) => electricalBranches.push(branch),
    addVoltageSource: (source) => electricalSources.push(source),
    getNodeVoltage: (partId, pinId) =>
      circuitSolution && electricalGraphRef ? circuitSolution.nodeVoltage(electricalGraphRef.nodeId(partId, pinId)) : 0,
    getSourceCurrent: (sourceId) => (circuitSolution ? circuitSolution.sourceCurrent(sourceId) : 0),
    hasFlag: (flagName, partId) => flags.get(flagName)?.has(partId) ?? false,
  };

  // --- Topology phase: ALWAYS runs, running or paused. ---
  for (const part of parts) {
    const def = partDefinitions[part.type];
    if (!def) continue;
    for (const pin of def.pins) uf.find(pinKey(part.id, pin.id));
  }

  for (const wire of wires) {
    uf.union(pinKey(wire.from.partId, wire.from.pinId), pinKey(wire.to.partId, wire.to.pinId));
  }

  for (const part of parts) {
    getComponentModel(part.type)?.connect?.(part, ctx);
  }

  const breadboards = parts.filter((p) => p.type.startsWith("breadboard"));
  if (breadboards.length > 0) {
    const breadboardPins = breadboards.flatMap((bb) =>
      getResolvedPins(bb).map((p) => ({ ...p, bbPartId: bb.id }))
    );
    for (const part of parts) {
      if (part.type.startsWith("breadboard")) continue;
      for (const pin of getResolvedPins(part)) {
        for (const bbPin of breadboardPins) {
          if (Math.hypot(bbPin.x - pin.x, bbPin.y - pin.y) < BREADBOARD_CONTACT_EPSILON_PX) {
            uf.union(pinKey(part.id, pin.pinId), pinKey(bbPin.bbPartId, bbPin.pinId));
          }
        }
      }
    }
  }

  const arePinsConnectedImpl = (partIdA: string, pinIdA: string, partIdB: string, pinIdB: string) =>
    uf.find(pinKey(partIdA, pinIdA)) === uf.find(pinKey(partIdB, pinIdB));

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
      arePinsConnected: arePinsConnectedImpl,
      getCapacitorStoredVoltage: (partId) => Number(parts.find((p) => p.id === partId)?.properties?.storedVoltage ?? 0),
      getExternalSupplyVoltage: () => 0,
      isNetGrounded: () => false,
      getLoadResistanceOnNet: (partId, pinId) => sumSeriesResistance(new Set([uf.find(pinKey(partId, pinId))])),
      getElectricalReading: () => null,
      getNodeVoltage: () => 0,
      getSourceCurrent: () => 0,
      hasFlag: () => false,
      getFaults: () => [],
    };
  }

  // -- Everything below only runs while isRunning. ---
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

  for (const part of parts) {
    getComponentModel(part.type)?.driveAfterPower?.(part, ctx);
  }

  for (const part of parts) {
    getComponentModel(part.type)?.postResolve?.(part, ctx);
  }

  electricalGraphRef = buildElectricalGraph(parts, wires);

  for (const part of parts) {
    getComponentModel(part.type)?.contributeElectricalBranches?.(part, ctx);
  }

  circuitSolution = solveCircuit(electricalGraphRef.nodeCount, electricalBranches, electricalSources);

  function isPartPowered(partId: string): boolean {
    const vccRoot = uf.find(pinKey(partId, "vcc"));
    const gndRoot = uf.find(pinKey(partId, "gnd"));
    return netPower.has(vccRoot) && netGround.has(gndRoot);
  }

  for (const part of parts) {
    getComponentModel(part.type)?.resolveVoltage?.(part, ctx);
  }

  // Phase F -- fault detection. Runs after resolveVoltage so every model's
  // eager per-part flags (resistorOverloaded, ledBlown, etc.) are already
  // set, and after the MNA solve so sourceCurrent()/getNodeVoltage() are
  // meaningful for the short-circuit/conflicting-source/floating-node checks.
  faultsRef = detectFaults(
    parts,
    electricalGraphRef,
    electricalBranches,
    electricalSources,
    circuitSolution,
    netDrivenHigh,
    netDrivenLow,
    ctx.hasFlag
  );

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
    arePinsConnected: arePinsConnectedImpl,

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
    getElectricalReading: (partId) => ctx.getElectricalReading(partId),
    getNodeVoltage: (partId, pinId) => ctx.getNodeVoltage(partId, pinId),
    getSourceCurrent: (sourceId) => ctx.getSourceCurrent(sourceId),
    hasFlag: (flagName, partId) => ctx.hasFlag(flagName, partId),
    getFaults: () => faultsRef,
  };
}