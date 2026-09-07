// engine/capacitor.ts
import { getCapacitanceFarads } from "../../config/partDefinitions";
import type { PartInstance } from "../../types/types";
import type { Netlist } from "../netlist";

/**
 * Computes the capacitor's next stored voltage for one animation frame,
 * using a standard RC exponential charge/discharge model:
 *
 *   charging:    V(t) = Vtarget + (V0 - Vtarget) * e^(-t / RC)
 *   discharging: V(t) = V0 * e^(-t / RC)
 *
 * "Charging" means the cap's positive pin sees a real external source
 * (battery/Arduino pin, NOT another capacitor) AND its negative pin is
 * grounded -- getExternalSupplyVoltage() deliberately ignores capacitor
 * fallback voltage, so this never confuses "the cap is powering itself."
 * Otherwise it discharges through whatever resistance sits on its net,
 * or holds its charge indefinitely if nothing is currently connected to
 * drain it (an ideal capacitor with no load).
 */
export function computeNextCapacitorVoltage(part: PartInstance, netlist: Netlist, dtSeconds: number): number {
  const isPolarized = part.type === "capacitor-polarized";
  const posPin = isPolarized ? "positive" : "pin1";
  const negPin = isPolarized ? "negative" : "pin2";

  const capacitanceFarads = Math.max(getCapacitanceFarads(part), 1e-15);
  const storedVoltage = Number(part.properties?.storedVoltage ?? 0);
  const voltageRating = Number(part.properties?.voltageRating ?? 1000);

  const supplyV = netlist.getExternalSupplyVoltage(part.id, posPin);
  const grounded = netlist.isNetGrounded(part.id, negPin);

  if (supplyV > 0 && grounded) {
    const target = isPolarized ? Math.min(supplyV, voltageRating) : supplyV;
    const seriesR = netlist.getLoadResistanceOnNet(part.id, posPin) || 220;
    const tau = seriesR * capacitanceFarads;
    return target + (storedVoltage - target) * Math.exp(-dtSeconds / Math.max(tau, 1e-6));
  }

  const loadR = netlist.getLoadResistanceOnNet(part.id, posPin);
  if (loadR > 0) {
    const tau = loadR * capacitanceFarads;
    return storedVoltage * Math.exp(-dtSeconds / Math.max(tau, 1e-6));
  }

  return storedVoltage;
}