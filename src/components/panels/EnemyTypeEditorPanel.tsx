import type { EnemyTypeInput } from "../../engine/models";

interface EnemyTypeEditorPanelProps {
  enemyTypes: EnemyTypeInput[];
  selectedEnemyTypeId: string | null;
  selectedEnemyType: EnemyTypeInput | null;
  onSelectEnemyType: (enemyTypeId: string) => void;
  onAddEnemyType: () => void;
  onDuplicateEnemyType: (enemyTypeId: string) => void;
  onDeleteEnemyType: (enemyTypeId: string) => void;
  onChangeEnemyType: (patch: Partial<EnemyTypeInput>) => void;
}

const TEXT = {
  title: "\u654c\u4eba\u6a21\u677f\u5e93",
  add: "\u6dfb\u52a0\u6a21\u677f",
  current: "\u5f53\u524d\u6a21\u677f",
  duplicate: "\u590d\u5236",
  delete: "\u5220\u9664",
  hint: "\u5148\u521b\u5efa\u4e00\u4e2a\u6a21\u677f\uff0c\u518d\u53bb\u65f6\u95f4\u8f74\u7f16\u6392\u5237\u602a\u3002",
  basic: "\u57fa\u7840\u53c2\u6570",
  advanced: "\u9ad8\u7ea7\u53c2\u6570",
  followRoute: "\u8ddf\u968f\u8def\u7ebf"
} as const;

export function EnemyTypeEditorPanel({
  enemyTypes,
  selectedEnemyTypeId,
  selectedEnemyType,
  onSelectEnemyType,
  onAddEnemyType,
  onDuplicateEnemyType,
  onDeleteEnemyType,
  onChangeEnemyType
}: EnemyTypeEditorPanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="panel__eyebrow">Enemies</span>
          <h2>{TEXT.title}</h2>
        </div>
        <button type="button" onClick={onAddEnemyType}>
          {TEXT.add}
        </button>
      </div>

      {enemyTypes.length > 0 ? (
        <div className="compact-picker">
          <label className="field-block field-block--grow">
            {TEXT.current}
            <select value={selectedEnemyTypeId ?? ""} onChange={(event) => onSelectEnemyType(event.target.value)}>
              {enemyTypes.map((enemyType) => (
                <option key={enemyType.id} value={enemyType.id}>
                  {enemyType.name}
                </option>
              ))}
            </select>
          </label>
          {selectedEnemyType ? (
            <>
              <button type="button" onClick={() => onDuplicateEnemyType(selectedEnemyType.id)}>
                {TEXT.duplicate}
              </button>
              <button type="button" className="button-danger" onClick={() => onDeleteEnemyType(selectedEnemyType.id)}>
                {TEXT.delete}
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <p className="hint-text">{TEXT.hint}</p>
      )}

      {selectedEnemyType ? (
        <>
          <details className="details-panel" open>
            <summary>{TEXT.basic}</summary>
            <div className="field-grid">
              <label className="field-block">
                name
                <input value={selectedEnemyType.name} onChange={(event) => onChangeEnemyType({ name: event.target.value })} />
              </label>
              <label className="field-block">
                attribute_speed
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  value={selectedEnemyType.attribute_speed}
                  onChange={(event) => onChangeEnemyType({ attribute_speed: Number(event.target.value) })}
                />
              </label>
              <label className="field-block">
                moveMultiplier
                <input
                  type="number"
                  step="0.05"
                  min={0.1}
                  value={selectedEnemyType.moveMultiplier ?? 1}
                  onChange={(event) => onChangeEnemyType({ moveMultiplier: Number(event.target.value) })}
                />
              </label>
            </div>
          </details>

          <details className="details-panel">
            <summary>{TEXT.advanced}</summary>
            <div className="field-grid">
              <label className="field-block">
                move_mode_override
                <select
                  value={selectedEnemyType.move_mode_override ?? "inherit"}
                  onChange={(event) =>
                    onChangeEnemyType({
                      move_mode_override: event.target.value === "inherit" ? null : (event.target.value as "ground" | "fly")
                    })
                  }
                >
                  <option value="inherit">{TEXT.followRoute}</option>
                  <option value="ground">ground</option>
                  <option value="fly">fly</option>
                </select>
              </label>
              <label className="field-block">
                steeringFactor
                <input
                  type="number"
                  step="1"
                  min={0}
                  value={selectedEnemyType.steeringFactor ?? 16}
                  onChange={(event) => onChangeEnemyType({ steeringFactor: Number(event.target.value) })}
                />
              </label>
              <label className="field-block">
                maxSteeringForce
                <input
                  type="number"
                  step="1"
                  min={0}
                  value={selectedEnemyType.maxSteeringForce ?? 30}
                  onChange={(event) => onChangeEnemyType({ maxSteeringForce: Number(event.target.value) })}
                />
              </label>
              <label className="field-block">
                halfBodyWidth
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={selectedEnemyType.halfBodyWidth ?? 0.2}
                  onChange={(event) => onChangeEnemyType({ halfBodyWidth: Number(event.target.value) })}
                />
              </label>
              <label className="field-block">
                footOffset.x
                <input
                  type="number"
                  step="0.01"
                  value={selectedEnemyType.footOffset?.[0] ?? 0}
                  onChange={(event) =>
                    onChangeEnemyType({
                      footOffset: [Number(event.target.value), selectedEnemyType.footOffset?.[1] ?? 0.2]
                    })
                  }
                />
              </label>
              <label className="field-block">
                footOffset.y
                <input
                  type="number"
                  step="0.01"
                  value={selectedEnemyType.footOffset?.[1] ?? 0.2}
                  onChange={(event) =>
                    onChangeEnemyType({
                      footOffset: [selectedEnemyType.footOffset?.[0] ?? 0, Number(event.target.value)]
                    })
                  }
                />
              </label>
              <label className="field-block">
                cursor_offset.x
                <input
                  type="number"
                  step="0.01"
                  value={selectedEnemyType.cursor_offset?.[0] ?? 0}
                  onChange={(event) =>
                    onChangeEnemyType({
                      cursor_offset: [Number(event.target.value), selectedEnemyType.cursor_offset?.[1] ?? 0]
                    })
                  }
                />
              </label>
              <label className="field-block">
                cursor_offset.y
                <input
                  type="number"
                  step="0.01"
                  value={selectedEnemyType.cursor_offset?.[1] ?? 0}
                  onChange={(event) =>
                    onChangeEnemyType({
                      cursor_offset: [selectedEnemyType.cursor_offset?.[0] ?? 0, Number(event.target.value)]
                    })
                  }
                />
              </label>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
