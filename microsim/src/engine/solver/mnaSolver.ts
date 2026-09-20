// engine/solver/mnaSolver.ts
import type { ResistiveBranch, VoltageSourceBranch, CurrentSourceBranch, CircuitSolution } from "./electricalTypes";

const DEFAULT_SOURCE_SERIES_OHMS = 1;
const DEFAULT_CURRENT_SOURCE_COMPLIANCE_OHMS = 10_000_000; // "GMIN"-style stabilizer -- see CurrentSourceBranch's doc comment

/**
 * Solves a linear resistive network via Modified Nodal Analysis.
 *
 * IMPORTANT: only nodes actually referenced by a resistive branch, a
 * voltage source, or a current source become solver unknowns.
 * electricalGraph.ts pre-assigns a node id to every pin of every part on
 * the canvas, but most untouched pins never get touched by anything
 * electrical. Sizing the matrix off the raw node count and including
 * those untouched pins as full unknowns gives an all-zero row, which
 * makes the WHOLE matrix singular. Filtering to only touched nodes fixes
 * this.
 *
 * Every voltage source gets its own internal node, bridged to nodeA by
 * its (real or defaulted) series resistance -- a Thevenin-style source
 * model rather than a bare ideal source.
 *
 * CURRENT SOURCES (Phase 8): an ideal current source doesn't need its own
 * unknown the way a voltage source does -- the current is already known,
 * so it only contributes an RHS injection at its two nodes (see the stamp
 * below). It DOES still need a parallel compliance resistor (~10MΩ by
 * default) so the matrix never goes singular if the source's two nodes
 * have no other path between them -- the same role a voltage source's
 * series resistance plays, just wired in parallel instead of in series.
 *
 * SCOPE: every source is still assumed referenced to the single ground
 * node (node 0) -- see electricalGraph.ts.
 */
export function solveCircuit(
  _nodeCount: number,
  branches: ResistiveBranch[],
  sources: VoltageSourceBranch[],
  currentSources: CurrentSourceBranch[] = []
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
  for (const cs of currentSources) {
    noteTouched(cs.nodeA);
    noteTouched(cs.nodeB);
  }

  const realNodeList = Array.from(touchedRealNodes);
  const realNodeIndex = new Map<number, number>();
  realNodeList.forEach((node, i) => realNodeIndex.set(node, i));

  const R = realNodeList.length; // touched real (non-ground) node unknowns
  const S = sources.length; // one internal node + one branch-current unknown per VOLTAGE source only
  const size = R + 2 * S;

  if (size <= 0) {
    return { nodeVoltage: () => 0, sourceCurrent: () => 0 };
  }

  // Row/col layout: [0 .. R)      = touched real nodes
  //                 [R .. R+S)    = each voltage source's internal node
  //                 [R+S .. R+2S) = each voltage source's branch-current unknown
  // Current sources add NO rows/columns of their own -- see file header.
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

  // --- Current sources: compliance-resistor conductance stamp (KCL, same
  // shape as a normal resistive branch) plus the RHS current injection.
  // Split into two loops purely for readability -- order doesn't matter
  // since both write into disjoint parts of the matrix (off-diagonal
  // conductances vs. the RHS column). ---
  for (const cs of currentSources) {
    const complianceOhms = Math.max(cs.complianceOhms ?? DEFAULT_CURRENT_SOURCE_COMPLIANCE_OHMS, 1);
    const g = 1 / complianceOhms;
    const rowA = realRow(cs.nodeA);
    const rowB = realRow(cs.nodeB);

    if (rowA !== null) A[rowA][rowA] += g;
    if (rowB !== null) A[rowB][rowB] += g;
    if (rowA !== null && rowB !== null) {
      A[rowA][rowB] -= g;
      A[rowB][rowA] -= g;
    }
  }

  for (const cs of currentSources) {
    const rowA = realRow(cs.nodeA);
    const rowB = realRow(cs.nodeB);
    // `amps` flows OUT of nodeA into the external circuit and back into
    // the source at nodeB. In nodal-analysis terms: current is injected
    // INTO node A (RHS += amps) and drawn OUT of node B (RHS -= amps).
    // Verified against the simplest case -- a current source into a
    // single resistor R to ground gives V = I*R, exactly as expected.
    if (rowA !== null) A[rowA][size] += cs.amps;
    if (rowB !== null) A[rowB][size] -= cs.amps;
  }

  // --- Each voltage source: series resistor (internalNode <-> nodeA) stamped via
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