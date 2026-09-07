interface OvercurrentBurstProps {
  cx: number;
  cy: number;
  size?: number;
}

function buildStarPoints(cx: number, cy: number, spikes: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  const step = Math.PI / spikes;
  let angle = -Math.PI / 2;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    points.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
    angle += step;
  }
  return points.join(" ");
}

/** Starburst "destroyed by overcurrent" indicator -- shown once a component's real current exceeds its rated safe maximum. */
export function OvercurrentBurst({ cx, cy, size = 26 }: OvercurrentBurstProps) {
  const outerPoints = buildStarPoints(cx, cy, 8, size, size * 0.42);
  const innerPoints = buildStarPoints(cx, cy, 8, size * 0.62, size * 0.26);

  return (
    <g className="pointer-events-none">
      <polygon points={outerPoints} fill="#facc15" stroke="#b45309" strokeWidth={1.5} />
      <polygon points={innerPoints} fill="#ef4444" stroke="#7f1d1d" strokeWidth={1} />
      <title>Overcurrent -- exceeds rated maximum current, component destroyed</title>
    </g>
  );
}