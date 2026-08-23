import { GRID } from "../types/types";
import type { PartInstance, ResolvedPin } from "../types/types";
import { partDefinitions } from "../config/partDefinitions";

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

export function snapToGrid(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export function buildOrthogonalPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  waypoints: { x: number; y: number }[] = []
) {
  const points = [from, ...waypoints, to];

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];

    if (previous.x === current.x || previous.y === current.y) {
      // Already aligned
      path += ` L ${current.x} ${current.y}`;
    } else {
      // Vertical first, then horizontal
      path += ` L ${previous.x} ${current.y}`;
      path += ` L ${current.x} ${current.y}`;
    }
  }

  return path;
}