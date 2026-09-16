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