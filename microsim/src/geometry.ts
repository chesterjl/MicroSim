import { GRID } from "./types/types";
import type { PartInstance, ResolvedPin } from "./types/types";
import { partDefinitions } from "./partDefinitions";

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
): string {
  const points = [from, ...waypoints, to];
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];

    if (curr.x === next.x && curr.y === next.y) continue;

    if (curr.x === next.x || curr.y === next.y) {
      path += ` L ${next.x} ${next.y}`;
    } else {
      path += ` L ${next.x} ${curr.y} L ${next.x} ${next.y}`;
    }
  }

  return path;
}