interface HoverTooltipProps {
  text: string;
  x: number;
  y: number;
}

export function HoverTooltip({ text, x, y }: HoverTooltipProps) {
  return (
    <div className="hover-tooltip" style={{ left: x, top: y }}>
      <pre>{text}</pre>
    </div>
  );
}
