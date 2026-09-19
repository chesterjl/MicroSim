import type { ComponentModel } from "../../engine/componentModel";

/**
 * Adjustable bench-style DC power supply. Unlike the fixed 9V battery,
 * this source has a live-adjustable voltage (0-30V) and a settable
 * current limit (0.1-5A) that the supply enforces the way a real
 * constant-voltage/constant-current bench supply does: it holds the set
 * voltage until the load would draw more than the current limit, at
 * which point it "folds back" -- raising its own internal resistance so
 * the load current gets pulled back down toward the limit instead of
 * forcing an unlimited current through it. This is the supply's
 * PROTECTION mechanism, not a fault -- unlike a resistor/LED/etc.
 * blowing out, a real bench supply in CC mode is working exactly as
 * designed.
 *
 * There's no iterative/nonlinear solver in this codebase yet (that's
 * Phase 6+ scope), so the foldback uses the SAME one-frame-delayed
 * feedback trick capacitorModel already uses for its charge estimate:
 * this frame's series resistance is chosen based on LAST frame's
 * measured current. At 60 solves/second this settles indistinguishably
 * fast from a human's perspective, without needing a real iterative solve.
 */
export const MIN_VOLTAGE = 0;
export const MAX_VOLTAGE = 30;
export const MIN_CURRENT_LIMIT = 0.1;
export const MAX_CURRENT_LIMIT = 5;

const BASE_INTERNAL_OHMS = 0.5; // small internal source resistance, even unlimited
const CURRENT_LIMIT_ENGAGE_RATIO = 0.95; // flag "limiting" a hair before the hard cap, like a real CC LED

function isPoweredOn(part: { properties?: Record<string, unknown> }): boolean {
  return Boolean(part.properties?.poweredOn);
}

export function getVoltageSetpoint(part: { properties?: Record<string, unknown> }): number {
  const v = Number(part.properties?.voltageSetpoint ?? 5);
  return Math.min(MAX_VOLTAGE, Math.max(MIN_VOLTAGE, v));
}

export function getCurrentLimitAmps(part: { properties?: Record<string, unknown> }): number {
  const a = Number(part.properties?.currentLimitAmps ?? 1);
  return Math.min(MAX_CURRENT_LIMIT, Math.max(MIN_CURRENT_LIMIT, a));
}

export function powerSupplySourceId(partId: string): string {
  return `power-supply:${partId}`;
}

export const powerSupplyModel: ComponentModel = {
  sourceVoltage(part, pinId) {
    if (pinId !== "positive") return null;
    return getVoltageSetpoint(part);
  },

  isDeadSource(part) {
    // Switched off (or dialed all the way down to 0V) behaves the same
    // as a dead battery -- it simply isn't a source this frame. We're
    // deliberately NOT modeling a real supply's true open-circuit output
    // impedance when off -- see the file header.
    return !isPoweredOn(part) || getVoltageSetpoint(part) <= 0;
  },

  contributeElectricalBranches(part, ctx) {
    if (!isPoweredOn(part)) return;

    const voltageSetpoint = getVoltageSetpoint(part);
    if (voltageSetpoint <= 0) return;

    const currentLimitAmps = getCurrentLimitAmps(part);
    const lastMeasuredCurrent = Number(part.properties?.measuredCurrentAmps ?? 0);

    // Proportional foldback: only kicks in once last frame's current
    // actually exceeded the limit, and scales with how far over it was.
    let seriesOhms = BASE_INTERNAL_OHMS;
    if (lastMeasuredCurrent > currentLimitAmps) {
      const excessRatio = lastMeasuredCurrent / currentLimitAmps;
      const foldbackOhms = (voltageSetpoint / currentLimitAmps) * (excessRatio - 1);
      seriesOhms = Math.max(seriesOhms, seriesOhms + foldbackOhms);
    }

    ctx.addVoltageSource({
      id: powerSupplySourceId(part.id),
      partId: part.id,
      nodeA: ctx.electricalNodeId!(part.id, "positive"),
      nodeB: ctx.electricalNodeId!(part.id, "negative"),
      volts: voltageSetpoint,
      seriesOhms,
    });
  },

  resolveVoltage(part, ctx) {
    if (!isPoweredOn(part)) {
      part.properties.measuredCurrentAmps = 0;
      return;
    }

    const currentLimitAmps = getCurrentLimitAmps(part);
    const current = Math.abs(ctx.getSourceCurrent(powerSupplySourceId(part.id)));

    // Persisted purely so NEXT frame's contributeElectricalBranches can
    // react to it -- see the foldback comment above.
    part.properties.measuredCurrentAmps = current;

    if (current >= currentLimitAmps * CURRENT_LIMIT_ENGAGE_RATIO) {
      ctx.setFlag("powerSupplyCurrentLimiting", part.id);
    }
  },
};