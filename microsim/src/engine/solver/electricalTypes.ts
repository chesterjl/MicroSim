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
}

export interface CircuitSolution {
  nodeVoltage(node: number): number;
  sourceCurrent(sourceId: string): number;
}