// engine/faults/faultTypes.ts
import type { PartInstance } from "../../types/types";

export type FaultSeverity = "warning" | "critical";

export type FaultType =
  | "short-circuit"
  | "conflicting-voltage-sources"
  | "floating-node"
  | "disconnected-component"
  | "no-ground-reference"
  | "invalid-connection"
  | "overloaded-component";

export interface Fault {
  type: FaultType;
  severity: FaultSeverity;
  /** Parts implicated in this fault. May be empty for whole-circuit faults (e.g. bus contention isn't currently attributed to a part -- see faultDetector.ts). */
  partIds: string[];
  message: string;
  /** True if this fault permanently destroys every part in partIds. */
  destructive: boolean;
}

/**
 * Shared vocabulary: maps a ComponentModel's own `ctx.setFlag(name, partId)`
 * call into a generic Fault. Add one entry here per flag a model raises --
 * this is what keeps "ledBlown", "resistorOverloaded", etc. from each
 * needing their own bespoke fault-detection code path.
 */
export interface FlagFaultDefinition {
  type: FaultType;
  severity: FaultSeverity;
  destructive: boolean;
  message: (part: PartInstance) => string;
}

export const FLAG_FAULT_REGISTRY: Record<string, FlagFaultDefinition> = {
  ledBlown: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `LED burned out -- current exceeded its rated maximum.`,
  },
  resistorOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `Resistor overheated -- dissipated power exceeded its rated wattage.`,
  },
  photoresistorOverloaded: {
    type: "overloaded-component",
    severity: "critical",
    destructive: true,
    message: () => `Photoresistor overheated -- dissipated power exceeded its rated wattage.`,
  },
};