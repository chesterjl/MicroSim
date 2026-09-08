import type { ResistiveBranch, VoltageSourceBranch, CircuitSolution } from "./electricalTypes";

const DEFAULT_SOURCE_SERIES_OHMS = 1;

/**
 * Solves a linear resistive network via Modified Nodal Analysis.
 *
 * IMPORTANT: only nodes actually referenced by a resistive branch or a
 * voltage source become solver unknowns. electricalGraph.ts pre-assigns a
 * node id to every pin of every part on the canvas (so branches CAN
 * reference any of them), but most pins on a typical part -- e.g. an
 * Arduino's d0-d13/a0-a5/aref/reset/vin when nothing's wired to them --
 * never get touched by anything electrical. Sizing the matrix off the raw
 * node count and including every one of those untouched pins as a full
 * unknown gives that row/column an all-zero entry -- and a single
 * all-zero row makes the WHOLE matrix singular, not just that one node.
 * That silently zeroes every current and voltage in the circuit, even
 * for parts that were wired correctly. Filtering to only touched nodes
 * fixes this.
 *
 * Every voltage source gets its own internal node, bridged to nodeA by
 * its (real or defaulted) series resistance -- a Thevenin-style source
 * model rather than a bare ideal source, which also keeps two sources
 * landing on the same node pair (e.g. an LED wired straight across a
 * battery with no resistor) solvable instead of singular.
 *
 * SCOPE: every source is still assumed referenced to the single ground
 * node (node 0) -- see electricalGraph.ts. A source floating between two
 * non-ground nodes, or multiple independent sources with no common
 * ground, aren't handled -- not a real limitation for the current
 * component library (one battery, one Arduino, always ground-referenced).
 */
export function solveCircuit(
  _nodeCount: number,
  branches: ResistiveBranch[],
  sources: VoltageSourceBranch[]
): CircuitSolution {
  // --- Step 1: find only the real (non-ground) nodes actually touched by
  // something electrical. Everything else is dropped from the matrix
  // entirely and just reads back as 0V. ---
  const touchedRealNodes = new Set<number>();
  const noteTouched = (node: number) => {
    if (node !== 0) touchedRealNodes.add(node);
  };
  for (const b of branches) {
    if (b.ohms <= 0) continue;
    noteTouched(b.nodeA);
    noteTouched(b.nodeB);
  }
  for (const s of sources) {
    noteTouched(s.nodeA);
    noteTouched(s.nodeB);
  }

  const realNodeList = Array.from(touchedRealNodes);
  const realNodeIndex = new Map<number, number>();
  realNodeList.forEach((node, i) => realNodeIndex.set(node, i));

  const R = realNodeList.length; // touched real (non-ground) node unknowns
  const S = sources.length; // one internal node + one branch-current unknown per source
  const size = R + 2 * S;

  if (size <= 0) {
    return { nodeVoltage: () => 0, sourceCurrent: () => 0 };
  }

  // Row/col layout: [0 .. R)      = touched real nodes
  //                 [R .. R+S)    = each source's internal node
  //                 [R+S .. R+2S) = each source's branch-current unknown
  const realRow = (node: number): number | null => {
    const i = realNodeIndex.get(node);
    return i === undefined ? null : i; // null means "ground or untouched -- skip"
  };
  const internalRow = (sourceIdx: number) => R + sourceIdx;
  const currentCol = (sourceIdx: number) => R + S + sourceIdx;

  const A: number[][] = Array.from({ length: size }, () => new Array(size + 1).fill(0));

  // --- KCL: conductance stamps for every resistive branch between two
  // touched nodes. A branch to ground (node 0) only stamps the non-ground
  // side, same as classic nodal analysis. ---
  for (const branch of branches) {
    if (branch.ohms <= 0) continue; // a true 0-ohm short belongs in the topology graph, not here
    const g = 1 / branch.ohms;
    const rowA = realRow(branch.nodeA);
    const rowB = realRow(branch.nodeB);

    if (rowA !== null) A[rowA][rowA] += g;
    if (rowB !== null) A[rowB][rowB] += g;
    if (rowA !== null && rowB !== null) {
      A[rowA][rowB] -= g;
      A[rowB][rowA] -= g;
    }
  }

  // --- Each source: series resistor (internalNode <-> nodeA) stamped via
  // KCL, plus the ideal-source KVL row/column (internalNode <-> nodeB). ---
  sources.forEach((source, i) => {
    const internal = internalRow(i);
    const seriesOhms = Math.max(source.seriesOhms ?? DEFAULT_SOURCE_SERIES_OHMS, 1e-6);
    const g = 1 / seriesOhms;

    const rowA = realRow(source.nodeA);

    A[internal][internal] += g;
    if (rowA !== null) {
      A[rowA][rowA] += g;
      A[internal][rowA] -= g;
      A[rowA][internal] -= g;
    }

    const col = currentCol(i);
    const rowB = realRow(source.nodeB);

    A[internal][col] += 1;
    A[col][internal] += 1;
    if (rowB !== null) {
      A[rowB][col] -= 1;
      A[col][rowB] -= 1;
    }

    A[col][size] = source.volts; // RHS: V(internalNode) - V(nodeB) = volts
  });

  const x = gaussianEliminate(A, size);
  if (!x) {
    return { nodeVoltage: () => 0, sourceCurrent: () => 0 };
  }

  return {
    nodeVoltage: (node) => {
      if (node === 0) return 0;
      const row = realRow(node);
      return row === null ? 0 : x[row]; // untouched node -- treat as 0V, like a floating pin elsewhere in the codebase
    },
    sourceCurrent: (sourceId) => {
      const i = sources.findIndex((s) => s.id === sourceId);
      return i === -1 ? 0 : x[currentCol(i)];
    },
  };
}

function gaussianEliminate(input: number[][], size: number): number[] | null {
  const A = input.map((r) => r.slice());

  for (let col = 0; col < size; col++) {
    let pivotRow = col;
    let maxAbs = Math.abs(A[col][col]);
    for (let r = col + 1; r < size; r++) {
      if (Math.abs(A[r][col]) > maxAbs) {
        maxAbs = Math.abs(A[r][col]);
        pivotRow = r;
      }
    }
    if (maxAbs < 1e-12) return null;

    if (pivotRow !== col) [A[col], A[pivotRow]] = [A[pivotRow], A[col]];

    const pivot = A[col][col];
    for (let c = col; c <= size; c++) A[col][c] /= pivot;

    for (let r = 0; r < size; r++) {
      if (r === col) continue;
      const factor = A[r][col];
      if (factor === 0) continue;
      for (let c = col; c <= size; c++) A[r][c] -= factor * A[col][c];
    }
  }

  return A.map((r) => r[size]);
}