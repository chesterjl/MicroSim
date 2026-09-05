import type { CPU } from "avr8js";

export interface ExternalDevice {
  claimedPins: number[];
  update: (cpu: CPU) => void;
}