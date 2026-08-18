import { GRID } from "./types/types";
import type { PartInstance, ResolvedPin } from "./types/types";
import { partDefinitions } from "./partDefinitions";

/**
 * Rotate a point (in grid units) around the origin by 0/90/180/270 degrees.
 * We rotate in grid-unit space (not px) so it stays exact.
 */
function rotatePoint(x: number, y: number, rotation: 0 | 90 | 180 | 270) {
  switch (rotation) {
    case 0:
      return { x, y };
    case 90:
      return { x: -y, y: x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: y, y: -x };
  }
}

/** Absolute canvas (px) positions of every pin on a part instance. */
export function getResolvedPins(part: PartInstance): ResolvedPin[] {
  const def = partDefinitions[part.type];
  if (!def) return [];

  return def.pins.map((pin) => {
    const rotated = rotatePoint(pin.x, pin.y, part.rotation);
    return {
      partId: part.id,
      pinId: pin.id,
      x: part.x + rotated.x * GRID,
      y: part.y + rotated.y * GRID,
      type: pin.type,
    };
  });
}

/** Find the pin nearest to a canvas point, within a max distance (px). Used for click-to-wire. */
export function findNearestPin(
  parts: PartInstance[],
  point: { x: number; y: number },
  maxDist = 12
): ResolvedPin | null {
  let closest: ResolvedPin | null = null;
  let closestDist = maxDist;

  for (const part of parts) {
    for (const pin of getResolvedPins(part)) {
      const d = Math.hypot(pin.x - point.x, pin.y - point.y);
      if (d < closestDist) {
        closest = pin;
        closestDist = d;
      }
    }
  }
  return closest;
}

/** Snap a raw canvas coordinate to the nearest grid intersection. */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID) * GRID;
}
