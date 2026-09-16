// engine/faults/faultDetector.ts
import type { PartInstance } from "../../types/types";
import { partDefinitions } from "../../config/partDefinitions";
import type { ElectricalGraph } from "../solver/electricalGraph";
import type { ResistiveBranch, VoltageSourceBranch, CircuitSolution } from "../solver/electricalTypes";
import { analyzeConnectivity } from "./connectivity";
import { FLAG_FAULT_REGISTRY, type Fault } from "./faultTypes";
import { isPartFloatingFromReference } from "../solver/isolation";

const SHORT_CIRCUIT_CURRENT_AMPS = 1.0;
const SOURCE_VOLTAGE_CONFLICT_TOLERANCE_V = 0.1;

function sourcePartIds(source: VoltageSourceBranch): string[] {
  if (source.partId) return [source.partId];
  const [, partId] = source.id.split(":");
  return partId ? [partId] : [];
}

function detectFlagFaults(parts: PartInstance[], hasFlag: (flag: string, partId: string) => boolean): Fault[] {
  const faults: Fault[] = [];
  for (const [flagName, definition] of Object.entries(FLAG_FAULT_REGISTRY)) {
    for (const part of parts) {
      if (hasFlag(flagName, part.id)) {
        faults.push({
          type: definition.type,
          severity: definition.severity,
          partIds: [part.id],
          destructive: definition.destructive,
          message: definition.message(part, hasFlag),
        });
      }
    }
  }
  return faults;
}

function detectElectricalFaults(sources: VoltageSourceBranch[], solution: CircuitSolution): Fault[] {
  const faults: Fault[] = [];
  const explainedSourceIds = new Set<string>();

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const a = sources[i];
      const b = sources[j];
      if (a.isJunctionDrop || b.isJunctionDrop) continue;

      const samePair =
        (a.nodeA === b.nodeA && a.nodeB === b.nodeB) || (a.nodeA === b.nodeB && a.nodeB === b.nodeA);
      if (!samePair) continue;
      if (Math.abs(a.volts - b.volts) <= SOURCE_VOLTAGE_CONFLICT_TOLERANCE_V) continue;

      explainedSourceIds.add(a.id);
      explainedSourceIds.add(b.id);

      faults.push({
        type: "conflicting-voltage-sources",
        severity: "critical",
        partIds: [...sourcePartIds(a), ...sourcePartIds(b)],
        destructive: false,
        message: `${a.id} and ${b.id} are both connected across the same two points at different voltages -- remove one or add isolation.`,
      });
    }
  }

  for (const source of sources) {
    if (explainedSourceIds.has(source.id)) continue;
    if (source.isJunctionDrop) continue;

    const current = Math.abs(solution.sourceCurrent(source.id));
    if (current > SHORT_CIRCUIT_CURRENT_AMPS) {
      faults.push({
        type: "short-circuit",
        severity: "critical",
        partIds: sourcePartIds(source),
        destructive: false,
        message: `Short circuit detected near ${source.id} -- ${current.toFixed(2)}A is far beyond a normal load.`,
      });
    }
  }

  return faults;
}

function detectTopologyFaults(
  parts: PartInstance[],
  graph: ElectricalGraph,
  branches: ResistiveBranch[],
  sources: VoltageSourceBranch[],
  netGround: Set<string>,
  netPower: Set<string>,
  pinRoot: (partId: string, pinId: string) => string
): Fault[] {
  const faults: Fault[] = [];
  const { reachableFromGround } = analyzeConnectivity(branches, sources, graph.groundNodeId);

  const anyGroundPinExists = parts.some((part) =>
    (partDefinitions[part.type]?.pins ?? []).some((pin) => pin.type === "ground")
  );

  if (!anyGroundPinExists) {
    faults.push({
      type: "no-ground-reference",
      severity: "warning",
      partIds: [],
      destructive: false,
      message: "This circuit has no ground reference at all -- add a GND connection so current has somewhere to return to.",
    });
  }

  for (const part of parts) {
    const def = partDefinitions[part.type];
    if (!def) continue;

    // Parts touching neither a power nor a ground reference anywhere in
    // their connected group are just parked on the canvas (or resting in
    // an unused breadboard column) -- never wired with intent, so flagging
    // them as "floating" is just noise. This uses the same reference-based
    // check as the solver's own guard, so the banner and the fix agree.
    if (isPartFloatingFromReference(part, netGround, netPower, pinRoot)) continue;

    const pinNodes = def.pins.map((pin) => graph.nodeId(part.id, pin.id));
    const anyReachable = pinNodes.some((node) => reachableFromGround.has(node));
    if (!anyReachable) {
      faults.push({
        type: "floating-node",
        severity: "warning",
        partIds: [part.id],
        destructive: false,
        message: `This part is wired to other components, but that group never reaches ground -- its voltage is undefined.`,
      });
    }
  }

  return faults;
}

function detectDigitalDriverConflicts(netDrivenHigh: Set<string>, netDrivenLow: Set<string>): Fault[] {
  for (const root of netDrivenHigh) {
    if (netDrivenLow.has(root)) {
      return [
        {
          type: "invalid-connection",
          severity: "warning",
          partIds: [],
          destructive: false,
          message: "Two outputs are driving the same wire to different logic levels (bus contention) -- disconnect one of them.",
        },
      ];
    }
  }
  return [];
}

export function detectFaults(
  parts: PartInstance[],
  graph: ElectricalGraph,
  branches: ResistiveBranch[],
  sources: VoltageSourceBranch[],
  solution: CircuitSolution,
  netDrivenHigh: Set<string>,
  netDrivenLow: Set<string>,
  netGround: Set<string>,
  netPower: Set<string>,
  pinRoot: (partId: string, pinId: string) => string,
  hasFlag: (flag: string, partId: string) => boolean
): Fault[] {
  return [
    ...detectFlagFaults(parts, hasFlag),
    ...detectElectricalFaults(sources, solution),
    ...detectTopologyFaults(parts, graph, branches, sources, netGround, netPower, pinRoot),
    ...detectDigitalDriverConflicts(netDrivenHigh, netDrivenLow),
  ];
}