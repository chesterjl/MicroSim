export interface OhmsLawReading {
  loopVoltage: number;
  totalResistanceOhms: number;
  currentAmps: number;
  forwardVoltageDrop: number;
}

export const LED_FORWARD_VOLTAGE: Record<string, number> = {
  red: 2.0,
  yellow: 2.1,
  green: 2.2,
  blue: 3.2,
  white: 3.2,
};

export const DEFAULT_LED_FORWARD_VOLTAGE = 2.0;
export const DEFAULT_LED_RATED_CURRENT_AMPS = 0.02; // 20mA -- standard operating current

// Anchor points calibrated to real 5mm LED behavior: (Amps)
//   < 0.0005 A        -> not perceptibly lit
//   0.0005 A - 0.0019 A     -> faint, but clearly visible indoors
//   0.002 A - 0.003 A       -> ramps up to standard/rated brightness
//   > 0.0031 A           -> destroyed (burnt out)
export const MIN_VISIBLE_CURRENT_AMPS = 0.00005; // 0.0005 A
export const FAINT_CURRENT_AMPS = 0.002; // 0.002 A -- top of the "faint but visible" band
export const MAX_SAFE_CURRENT_AMPS = 0.03; // 0.003 A -- beyond this, the LED is destroyed

export function calculateCurrentAmps(
  loopVoltage: number,
  totalResistanceOhms: number,
  forwardVoltageDrop = 0
): number {
  const effectiveVoltage = loopVoltage - forwardVoltageDrop;
  if (effectiveVoltage <= 0) return 0;
  const resistance = Math.max(totalResistanceOhms, 1);
  return effectiveVoltage / resistance;
}

/**
 * Maps a real current to a 0..1 visual brightness using a two-segment
 * curve anchored to the perceptual bands above, instead of a single gamma
 * power-law over the raw current/rated ratio. A flat gamma curve badly
 * over-brightens the low end -- e.g. a 1kΩ series resistor giving ~3mA (a
 * real "just above faint" current) rendered at 40%+ brightness under the
 * old curve, when it should look like a subtle, barely-there glow.
 */
export function currentToBrightness(currentAmps: number, ratedCurrentAmps = DEFAULT_LED_RATED_CURRENT_AMPS): number {
  if (currentAmps <= MIN_VISIBLE_CURRENT_AMPS) return 0;

  if (currentAmps <= FAINT_CURRENT_AMPS) {
    // perceived light intensity is roughly logarithmic in current, not linear.
    const logMin = Math.log10(MIN_VISIBLE_CURRENT_AMPS);
    const logFaint = Math.log10(FAINT_CURRENT_AMPS);
    const logCurrent = Math.log10(currentAmps);
    const t = (logCurrent - logMin) / (logFaint - logMin);
    return Math.max(0, Math.min(0.25, 0.25 * t));
  }

  // Standard band: 2mA -> ratedCurrentAmps maps to 0.25 -> 1.0.
  const t = (currentAmps - FAINT_CURRENT_AMPS) / Math.max(ratedCurrentAmps - FAINT_CURRENT_AMPS, 1e-6);
  return Math.max(0.25, Math.min(1, 0.25 + 0.75 * t));
}

// True once current exceeds the component's safe rated maximum -- the point a real LED burns out. 
export function isOvercurrent(currentAmps: number, maxSafeAmps = MAX_SAFE_CURRENT_AMPS): boolean {
  return currentAmps > maxSafeAmps;
}