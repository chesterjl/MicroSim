import type { ComponentModel } from "../../engine/componentModel";

// Ideal DC current source -- forces a FIXED CURRENT through whatever's
// connected, regardless of that load's resistance. This is the
// mathematically exact version (a real CurrentSourceBranch stamped in the
// MNA solver), not a resistor-based approximation -- see mnaSolver.ts.
const DEFAULT_CURRENT_AMPS = 0.02; // 20mA, a common bench/test current
const DEFAULT_MAX_COMPLIANCE_VOLTAGE = 30; // highest voltage the source can develop before it "runs out of headroom"

export function currentSourceId(partId: string): string {
  return `current-source:${partId}`;
}

export const currentSourceModel: ComponentModel = {
  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return;

    const amps = Number(part.properties?.currentAmps ?? DEFAULT_CURRENT_AMPS);
    if (amps === 0) return;

    ctx.addCurrentSource({
      id: currentSourceId(part.id),
      partId: part.id,
      nodeA: ctx.electricalNodeId!(part.id, "positive"),
      nodeB: ctx.electricalNodeId!(part.id, "negative"),
      amps,
    });
  },

  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    const maxComplianceVoltage = Number(part.properties?.maxComplianceVoltage ?? DEFAULT_MAX_COMPLIANCE_VOLTAGE);

    const vPositive = ctx.getNodeVoltage(part.id, "positive");
    const vNegative = ctx.getNodeVoltage(part.id, "negative");
    const developedVoltage = Math.abs(vPositive - vNegative);

    // A REAL current source can only push its set current by "developing"
    // whatever voltage the load needs (V = I * R_load). If the load's
    // resistance is too high (or the loop is open), it would need to
    // develop more voltage than it physically can -- like a broken
    // current-transformer loop in real electrical systems. Flagged, not
    // silently allowed.
    if (developedVoltage > maxComplianceVoltage) {
      ctx.setFlag("currentSourceOverCompliance", part.id);
    }
  },
};