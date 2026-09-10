// engine/faults/connectivity.ts
import type { ResistiveBranch, VoltageSourceBranch } from "../solver/electricalTypes";

export interface ConnectivityInfo {
  /** Every node touched by at least one real branch/source -- mirrors mnaSolver's own filtering, so pre-assigned-but-unused pins never get flagged. */
  touchedNodes: Set<number>;
  /** Subset of touchedNodes reachable from ground through branches/sources, treated as an undirected graph. */
  reachableFromGround: Set<number>;
}

export function analyzeConnectivity(
  branches: ResistiveBranch[],
  sources: VoltageSourceBranch[],
  groundNodeId: number
): ConnectivityInfo {
  const adjacency = new Map<number, number[]>();
  const touchedNodes = new Set<number>();

  const addEdge = (a: number, b: number) => {
    touchedNodes.add(a);
    touchedNodes.add(b);
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push(b);
    adjacency.get(b)!.push(a);
  };

  for (const branch of branches) {
    if (branch.ohms <= 0) continue; // matches mnaSolver's own skip of true 0-ohm shorts
    addEdge(branch.nodeA, branch.nodeB);
  }
  for (const source of sources) {
    addEdge(source.nodeA, source.nodeB);
  }

  const reachableFromGround = new Set<number>([groundNodeId]);
  const queue: number[] = [groundNodeId];
  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const neighbor of adjacency.get(node) ?? []) {
      if (!reachableFromGround.has(neighbor)) {
        reachableFromGround.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return { touchedNodes, reachableFromGround };
}