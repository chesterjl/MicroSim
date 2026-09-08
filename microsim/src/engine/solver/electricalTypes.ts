export interface ResistiveBranch {
  nodeA: number;
  nodeB: number;
  ohms: number;
}

/** An ideal voltage source between two electrical nodes -- battery, an Arduino rail, or (when conducting) an LED's forward-voltage-drop model. */
export interface VoltageSourceBranch {
  id: string;
  nodeA: number; // positive terminal
  nodeB: number; // negative terminal
  volts: number;
  /**
   * Internal series resistance (ohms) -- battery internal resistance, or
   * an LED's dynamic junction resistance beyond its fixed knee voltage.
   * Defaults to a small non-zero value in the solver when omitted. This
   * is what keeps two sources sharing the same node pair (e.g. an LED
   * wired straight across a battery with no resistor) solvable instead
   * of hitting a singular matrix -- the resulting large current then
   * correctly trips isOvercurrent instead of silently resolving to 0A.
   */
  seriesOhms?: number;
}

export interface CircuitSolution {
  nodeVoltage(node: number): number;
  sourceCurrent(sourceId: string): number;
}