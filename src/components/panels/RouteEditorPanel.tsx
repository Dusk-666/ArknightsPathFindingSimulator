import type { CheckpointInput, CheckpointType, RouteInput } from "../../engine/models";
import type { RoutePlacementMode } from "../../editor/models/routeEditorModel";

interface RouteEditorPanelProps {
  routes: RouteInput[];
  selectedRouteId: string | null;
  selectedRoute: RouteInput | null;
  routeColors: Record<string, string>;
  placementMode: RoutePlacementMode;
  selectedCheckpointIndex: number | null;
  onSelectRoute: (routeId: string) => void;
  onAddRoute: () => void;
  onDeleteRoute: (routeId: string) => void;
  onRenameRoute: (name: string) => void;
  onChangeRouteField: (patch: Partial<RouteInput>) => void;
  onSetPlacementMode: (mode: RoutePlacementMode) => void;
  onSelectCheckpoint: (index: number | null) => void;
  onAddWaitCheckpoint: () => void;
  onMoveCheckpoint: (index: number, direction: -1 | 1) => void;
  onRemoveCheckpoint: (index: number) => void;
  onUpdateCheckpoint: (index: number, patch: Partial<CheckpointInput>) => void;
}

const CHECKPOINT_TYPES: CheckpointType[] = ["MOVE", "PATROL_MOVE", "WAIT_FOR_SECONDS"];

const TEXT = {
  title: "\u8def\u7ebf\u7f16\u8f91\u5668",
  add: "\u65b0\u5efa\u8def\u7ebf",
  current: "\u5f53\u524d\u8def\u7ebf",
  delete: "\u5220\u9664",
  hint: "\u5148\u521b\u5efa\u4e00\u6761\u8def\u7ebf\uff0c\u518d\u5728\u5730\u56fe\u4e0a\u70b9\u51fb\u5b9a\u4f4d\u3002",
  setStart: "\u8bbe\u8d77\u70b9",
  setEnd: "\u8bbe\u7ec8\u70b9",
  parameters: "\u8def\u7ebf\u53c2\u6570",
  checkpoints: "\u68c0\u67e5\u70b9",
  quickSelect: "\u5feb\u901f\u5b9a\u4f4d",
  noneSelected: "\u672a\u9009\u62e9",
  moveUp: "\u4e0a\u79fb",
  moveDown: "\u4e0b\u79fb"
} as const;

export function RouteEditorPanel({
  routes,
  selectedRouteId,
  selectedRoute,
  routeColors,
  placementMode,
  selectedCheckpointIndex,
  onSelectRoute,
  onAddRoute,
  onDeleteRoute,
  onRenameRoute,
  onChangeRouteField,
  onSetPlacementMode,
  onSelectCheckpoint,
  onAddWaitCheckpoint,
  onMoveCheckpoint,
  onRemoveCheckpoint,
  onUpdateCheckpoint
}: RouteEditorPanelProps) {
  return (
    <section className="panel panel--routeEditor">
      <div className="panel__header">
        <div>
          <span className="panel__eyebrow">Routes</span>
          <h2>{TEXT.title}</h2>
        </div>
        <button type="button" onClick={onAddRoute}>
          {TEXT.add}
        </button>
      </div>

      {routes.length > 0 ? (
        <div className="compact-picker">
          <label className="field-block field-block--grow">
            {TEXT.current}
            <select value={selectedRouteId ?? ""} onChange={(event) => onSelectRoute(event.target.value)}>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </label>
          {selectedRouteId ? (
            <button type="button" className="button-danger" onClick={() => onDeleteRoute(selectedRouteId)}>
              {TEXT.delete}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="hint-text">{TEXT.hint}</p>
      )}

      {selectedRoute ? (
        <>
          <div className="route-editor-grid">
            <div className="route-editor-column">
              <div className="route-chip">
                <span className="swatch" style={{ backgroundColor: routeColors[selectedRoute.id] }} />
                <strong>{selectedRoute.id}</strong>
              </div>

              <div className="toolbar-row toolbar-row--dense">
                <button type="button" className={placementMode === "setStart" ? "is-active" : ""} onClick={() => onSetPlacementMode("setStart")}>
                  {TEXT.setStart}
                </button>
                <button type="button" className={placementMode === "setEnd" ? "is-active" : ""} onClick={() => onSetPlacementMode("setEnd")}>
                  {TEXT.setEnd}
                </button>
                <button
                  type="button"
                  className={placementMode === "addMoveCheckpoint" ? "is-active" : ""}
                  onClick={() => onSetPlacementMode("addMoveCheckpoint")}
                >
                  + MOVE
                </button>
                <button
                  type="button"
                  className={placementMode === "addPatrolCheckpoint" ? "is-active" : ""}
                  onClick={() => onSetPlacementMode("addPatrolCheckpoint")}
                >
                  + PATROL
                </button>
                <button type="button" onClick={onAddWaitCheckpoint}>
                  + WAIT
                </button>
              </div>

              <details className="details-panel" open>
                <summary>{TEXT.parameters}</summary>
                <div className="field-grid route-editor-fields">
                  <label className="field-block">
                    {"\u540d\u79f0"}
                    <input value={selectedRoute.name} onChange={(event) => onRenameRoute(event.target.value)} />
                  </label>
                  <label className="field-block">
                    move_mode
                    <select value={selectedRoute.move_mode} onChange={(event) => onChangeRouteField({ move_mode: event.target.value as RouteInput["move_mode"] })}>
                      <option value="ground">ground</option>
                      <option value="fly">fly</option>
                    </select>
                  </label>
                  <label className="field-block">
                    start_point
                    <input value={selectedRoute.start_point} onChange={(event) => onChangeRouteField({ start_point: event.target.value.toUpperCase() })} />
                  </label>
                  <label className="field-block">
                    end_point
                    <input value={selectedRoute.end_point} onChange={(event) => onChangeRouteField({ end_point: event.target.value.toUpperCase() })} />
                  </label>
                </div>

                <div className="checkbox-grid checkbox-grid--compact">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedRoute.allowDiagonalMove ?? false}
                      onChange={(event) => onChangeRouteField({ allowDiagonalMove: event.target.checked })}
                    />
                    <span>allowDiagonalMove</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedRoute.visitEveryTileCenter ?? false}
                      onChange={(event) =>
                        onChangeRouteField({
                          visitEveryTileCenter: event.target.checked,
                          visitEveryNodeCenter: false,
                          visitEveryNodeStably: false
                        })
                      }
                    />
                    <span>visitEveryTileCenter</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedRoute.visitEveryNodeCenter ?? false}
                      onChange={(event) =>
                        onChangeRouteField({
                          visitEveryTileCenter: false,
                          visitEveryNodeCenter: event.target.checked,
                          visitEveryNodeStably: false
                        })
                      }
                    />
                    <span>visitEveryNodeCenter</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedRoute.visitEveryNodeStably ?? false}
                      onChange={(event) =>
                        onChangeRouteField({
                          visitEveryTileCenter: false,
                          visitEveryNodeCenter: false,
                          visitEveryNodeStably: event.target.checked
                        })
                      }
                    />
                    <span>visitEveryNodeStably</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedRoute.visitEveryCheckPoint ?? false}
                      onChange={(event) => onChangeRouteField({ visitEveryCheckPoint: event.target.checked })}
                    />
                    <span>visitEveryCheckPoint</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedRoute.ignoreAllButMoveCp ?? false}
                      onChange={(event) => onChangeRouteField({ ignoreAllButMoveCp: event.target.checked })}
                    />
                    <span>ignoreAllButMoveCp</span>
                  </label>
                </div>
              </details>
            </div>

            <div className="route-editor-column route-editor-column--checkpoints">
              <details className="details-panel route-editor-details--full" open>
                <summary>{`${TEXT.checkpoints} (${selectedRoute.checkpoints?.length ?? 0})`}</summary>
                <div className="compact-picker">
                  <label className="field-block field-block--grow">
                    {TEXT.quickSelect}
                    <select
                      value={selectedCheckpointIndex ?? -1}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        onSelectCheckpoint(nextValue < 0 ? null : nextValue);
                      }}
                    >
                      <option value={-1}>{TEXT.noneSelected}</option>
                      {(selectedRoute.checkpoints ?? []).map((checkpoint, index) => (
                        <option key={checkpoint.id ?? `${selectedRoute.id}:${index}`} value={index}>
                          #{index + 1} {checkpoint.type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="checkpoint-list checkpoint-list--compact checkpoint-list--roomy">
                  {(selectedRoute.checkpoints ?? []).map((checkpoint, index) => (
                    <article
                      key={checkpoint.id ?? `${selectedRoute.id}:${index}`}
                      className={`checkpoint-item ${selectedCheckpointIndex === index ? "checkpoint-item--active" : ""}`}
                    >
                      <button type="button" className="checkpoint-item__select" onClick={() => onSelectCheckpoint(index)}>
                        <div className="checkpoint-item__title">
                          <strong>#{index + 1}</strong>
                          <span>{checkpoint.type}</span>
                        </div>
                      </button>

                      <div className="checkpoint-item__content">
                        <label className="field-block">
                          type
                          <select value={checkpoint.type} onChange={(event) => onUpdateCheckpoint(index, { type: event.target.value as CheckpointType })}>
                            {CHECKPOINT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </label>

                        {checkpoint.type === "WAIT_FOR_SECONDS" ? (
                          <label className="field-block">
                            seconds
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              value={checkpoint.seconds ?? 0}
                              onChange={(event) => onUpdateCheckpoint(index, { seconds: Number(event.target.value) })}
                            />
                          </label>
                        ) : (
                          <label className="field-block">
                            target
                            <input
                              value={checkpoint.target ?? ""}
                              onChange={(event) => onUpdateCheckpoint(index, { target: event.target.value.toUpperCase() })}
                            />
                          </label>
                        )}
                      </div>

                      <div className="toolbar-row toolbar-row--dense">
                        <button type="button" onClick={() => onMoveCheckpoint(index, -1)}>
                          {TEXT.moveUp}
                        </button>
                        <button type="button" onClick={() => onMoveCheckpoint(index, 1)}>
                          {TEXT.moveDown}
                        </button>
                        <button type="button" className="button-danger" onClick={() => onRemoveCheckpoint(index)}>
                          {TEXT.delete}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
