/**
 * Maps total series resistance (ohms) to a 0..1 brightness value for
 * light-emitting parts (LED, RGB LED channels). Shared so every emitter
 * model computes brightness the same way instead of re-deriving its own
 * curve.
 */
export function calculateBrightness(totalOhms: number): number {
  if (totalOhms <= 0) return 1.0;
  if (totalOhms >= 100000) return 0;
  const baseOhms = 220;
  const ratio = baseOhms / totalOhms;
  return Math.max(0, Math.min(1, ratio));
}