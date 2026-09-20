// engine/solver/electricalTypes.ts
export interface ResistiveBranch {
  nodeA: number;
  nodeB: number;
  ohms: number;
}

/** An ideal voltage source between two electrical nodes -- battery, an Arduino rail, or (when conducting) an LED's forward-voltage-drop model. */
export interface VoltageSourceBranch {
  id: string;
  /** Owning part id, for fault attribution. Falls back to parsing `id` (e.g. "battery:abc123") if omitted. */
  partId?: string;
  nodeA: number; // positive terminal
  nodeB: number; // negative terminal
  volts: number;
  seriesOhms?: number;

  /** True for a component's own internal forward-voltage model (LED/RGB LED junction drop, etc.) 
   * -- NOT an independent power supply. Landing on the same node pair as a real source at a 
   * different voltage means the junction is being overdriven, not two supplies disagreeing. 
   * faultDetector skips these in the conflicting-sources / generic-short checks and defers to 
   * the component's own overcurrent/blown-flag fault instead. */
  isJunctionDrop?: boolean;
}

export interface CircuitSolution {
  nodeVoltage(node: number): number;
  sourceCurrent(sourceId: string): number;
}

/** An ideal current source between two electrical nodes -- forces a FIXED
 * CURRENT through whatever's connected, regardless of that load's
 * resistance. The electrical dual of VoltageSourceBranch (which forces a
 * fixed voltage instead). `nodeA` is the source's "+" terminal: current
 * flows OUT of nodeA into the external circuit and returns to the source
 * at nodeB. */
export interface CurrentSourceBranch {
  id: string;
  partId?: string;
  nodeA: number;
  nodeB: number;
  amps: number;
  /** Very high parallel "compliance" resistance so the matrix never goes
   * singular even if this source's two nodes have no other path between
   * them -- the same solvability role every VoltageSourceBranch's
   * seriesOhms already plays. Defaults to 10MΩ if omitted, high enough
   * to never meaningfully steal current from a real load. */
  complianceOhms?: number;
}