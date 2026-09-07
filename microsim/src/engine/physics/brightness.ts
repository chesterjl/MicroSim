/**
 * Maps total series resistance (ohms) to a 0..1 brightness value. Kept
 * for any future non-current-based component that only has a resistance
 * value to work with -- LED/RGB-LED brightness now goes through the
 * current-based curve in ohmsLaw.ts instead, since that's physically
 * accurate rather than an ohms-only heuristic.
 */
export function calculateBrightness(totalOhms: number): number {
  if (totalOhms <= 0) return 1.0;
  if (totalOhms >= 100000) return 0;
  const baseOhms = 220;
  const ratio = baseOhms / totalOhms;
  return Math.max(0, Math.min(1, ratio));
}