// engine/faults/faultDetector.ts
import type { PartInstance } from "../../types/types";
import { partDefinitions } from "../../config/partDefinitions";
import type { ElectricalGraph } from "../solver/electricalGraph";
import type { ResistiveBranch, VoltageSourceBranch, CircuitSolution } from "../solver/electricalTypes";
import { analyzeConnectivity } from "./connectivity";
import { FLAG_FAULT_REGISTRY, type Fault } from "./faultTypes";

// Beyond this, treat a source's realized current as a direct short rather
// than a real load. Calibrated well above every model's own destructive
// threshold (LED's 30mA, a 0.25W/220ohm resistor's ~34mA) so a component
// that's simply blown gets its own specific fault instead of double-firing
// this generic one.
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
          message: definition.message(part),
        });
      }
    }
  }
  return faults;
}

function detectElectricalFaults(sources: VoltageSourceBranch[], solution: CircuitSolution): Fault[] {
  const faults: Fault[] = [];
  const explainedSourceIds = new Set<string>();

  // Conflicting sources: two sources landing on the same node pair with
  // meaningfully different voltages. Checked before the generic short
  // check below so we can attribute it specifically instead of just "a
  // short happened somewhere near you."
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const a = sources[i];
      const b = sources[j];
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

    const current = Math.abs(solution.sourceCurrent(source.id));
    if (current > SHORT_CIRCUIT_CURRENT_AMPS) {
      faults.push({
        type: "short-circuit",
        severity: "critical",
        partIds: sourcePartIds(source),
        destructive: false, // the source itself isn't destroyed; whatever's directly shorting it may report its own destructive fault
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
  sources: VoltageSourceBranch[]
): Fault[] {
  const faults: Fault[] = [];
  const { touchedNodes, reachableFromGround } = analyzeConnectivity(branches, sources, graph.groundNodeId);

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

    const pinNodes = def.pins.map((pin) => graph.nodeId(part.id, pin.id));
    const anyTouched = pinNodes.some((node) => touchedNodes.has(node));
    if (!anyTouched) continue; // bare, unwired part sitting on the canvas -- not worth flagging

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

/**
 * Bus contention: two OUTPUT drivers forcing the same net HIGH and LOW at
 * once. Uses the existing netDrivenHigh/netDrivenLow sets populated by
 * each model's drive()/driveAfterPower() hook -- no new detection
 * machinery, just checking for the overlap.
 *
 * NOTE: netDrivenHigh/netDrivenLow are keyed by union-find root, not part
 * id, so this can't attribute specific parts yet without extra bookkeeping
 * in the drive phase. Left as a whole-circuit warning for now.
 */
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
  hasFlag: (flag: string, partId: string) => boolean
): Fault[] {
  return [
    ...detectFlagFaults(parts, hasFlag),
    ...detectElectricalFaults(sources, solution),
    ...detectTopologyFaults(parts, graph, branches, sources),
    ...detectDigitalDriverConflicts(netDrivenHigh, netDrivenLow),
  ];
}