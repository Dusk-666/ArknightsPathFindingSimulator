import type { TileBrushId, TileBrushOption } from "../../editor/models/mapEditorModel";

interface MapBrushPanelProps {
  width: number;
  height: number;
  selectedBrush: TileBrushId;
  brushes: TileBrushOption[];
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onSelectBrush: (brush: TileBrushId) => void;
  onRebuildMap: () => void;
}

const TEXT = {
  title: "\u5730\u56fe\u7f16\u8f91\u5668",
  dimensions: "\u5730\u56fe\u5c3a\u5bf8",
  width: "\u5bbd",
  height: "\u9ad8",
  rebuild: "\u65b0\u5efa\u7a7a\u767d\u5730\u56fe"
} as const;

export function MapBrushPanel({
  width,
  height,
  selectedBrush,
  brushes,
  onWidthChange,
  onHeightChange,
  onSelectBrush,
  onRebuildMap
}: MapBrushPanelProps) {
  const activeBrush = brushes.find((brush) => brush.id === selectedBrush);

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="panel__eyebrow">Map</span>
          <h2>{TEXT.title}</h2>
        </div>
        <span className="panel__badge">{activeBrush?.label ?? selectedBrush}</span>
      </div>

      <details className="details-panel" open>
        <summary>{TEXT.dimensions}</summary>
        <div className="compact-picker">
          <label className="field-block">
            {TEXT.width}
            <input type="number" min={1} max={40} value={width} onChange={(event) => onWidthChange(Number(event.target.value))} />
          </label>
          <label className="field-block">
            {TEXT.height}
            <input type="number" min={1} max={30} value={height} onChange={(event) => onHeightChange(Number(event.target.value))} />
          </label>
          <button type="button" onClick={onRebuildMap}>
            {TEXT.rebuild}
          </button>
        </div>
      </details>

      <div className="brush-grid brush-grid--compact">
        {brushes.map((brush) => (
          <button
            key={brush.id}
            type="button"
            className={`brush-card ${selectedBrush === brush.id ? "brush-card--active" : ""}`}
            onClick={() => onSelectBrush(brush.id)}
            style={{ ["--brush-accent" as string]: brush.accent }}
          >
            <strong>{brush.label}</strong>
            <span>{brush.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
