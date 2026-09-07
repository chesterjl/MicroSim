/**
 * Small hex-color RGB interpolation helper shared by any part that needs
 * a continuous "off -> on" gradient (LED, RGB LED, etc.) instead of
 * hard-switching between two fixed swatches via opacity alone.
 */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Linearly interpolates between two hex colors. t=0 -> a, t=1 -> b. */
export function lerpColor(a: string, b: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(
    ar + (br - ar) * clampedT,
    ag + (bg - ag) * clampedT,
    ab + (bb - ab) * clampedT
  );
}