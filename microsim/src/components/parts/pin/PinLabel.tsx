interface PinLabelProps  {
  x: number;
  y: number;
  text: string;
  color?: string;
  fontSize?: number;
  textAnchor?: "start" | "middle" | "end";
}

export function PinLabel({ x, y, text, color = "#ffffff", fontSize = 5.5, textAnchor = "middle" }: PinLabelProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      fontSize={fontSize}
      fontWeight={700}
      fill={color}
      fontFamily="monospace"
      pointerEvents="none"
    >
      {text}
    </text>
  );
}