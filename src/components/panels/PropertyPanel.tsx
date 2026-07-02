interface PropertyPanelProps {
  selectedCell: string | null;
  terrainLabel: string;
  obstacleCost: number;
  showObstacleCost: boolean;
  interactionLabel: string;
  compileError: string | null;
  hintText?: string;
  allowObstacleEditing?: boolean;
  onObstacleCostChange?: (value: number) => void;
}

const TEXT = {
  title: "\u5f53\u524d\u5c5e\u6027",
  selectedCell: "\u9009\u4e2d\u683c\u5b50",
  terrain: "\u5730\u5757\u7c7b\u578b",
  interaction: "\u5f53\u524d\u4ea4\u4e92",
  obstacleCost: "\u969c\u788d\u4ee3\u4ef7",
  noneSelected: "\u672a\u9009\u62e9"
} as const;

export function PropertyPanel({
  selectedCell,
  terrainLabel,
  obstacleCost,
  showObstacleCost,
  interactionLabel,
  compileError,
  hintText,
  allowObstacleEditing = false,
  onObstacleCostChange
}: PropertyPanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="panel__eyebrow">Inspector</span>
          <h2>{TEXT.title}</h2>
        </div>
      </div>

      <div className="property-list">
        <div className="property-row">
          <span>{TEXT.selectedCell}</span>
          <strong>{selectedCell ?? TEXT.noneSelected}</strong>
        </div>
        <div className="property-row">
          <span>{TEXT.terrain}</span>
          <strong>{terrainLabel}</strong>
        </div>
        <div className="property-row">
          <span>{TEXT.interaction}</span>
          <strong>{interactionLabel}</strong>
        </div>
        {showObstacleCost && !allowObstacleEditing ? (
          <div className="property-row">
            <span>{TEXT.obstacleCost}</span>
            <strong>{obstacleCost}</strong>
          </div>
        ) : null}
      </div>

      {showObstacleCost && allowObstacleEditing && onObstacleCostChange ? (
        <label className="field-block">
          {TEXT.obstacleCost}
          <input
            type="number"
            min={1}
            max={99999}
            value={obstacleCost}
            onChange={(event) => onObstacleCostChange(Number(event.target.value))}
          />
        </label>
      ) : null}

      {compileError ? <p className="error-text">{compileError}</p> : hintText ? <p className="hint-text">{hintText}</p> : null}
    </section>
  );
}
