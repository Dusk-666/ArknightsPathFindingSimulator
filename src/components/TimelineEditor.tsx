import type { MouseEvent } from "react";
import type { EnemyTypeInput, RouteInput, SpawnEventInput } from "../engine/models";
import { formatFrameCount, parseTimeString } from "../engine/utils/time";
import { expandSpawnFrames } from "../editor/models/spawnEventModel";

interface TimelineEditorProps {
  currentFrame: number;
  maxFrame: number;
  isPlaying: boolean;
  error: string | null;
  events: SpawnEventInput[];
  selectedEventId: string | null;
  draft: SpawnEventInput;
  routes: RouteInput[];
  enemyTypes: EnemyTypeInput[];
  routeColors: Record<string, string>;
  onScrub: (frame: number) => void;
  onSelectEvent: (eventId: string | null) => void;
  onDraftChange: (patch: Partial<SpawnEventInput>) => void;
  onSaveDraft: () => void;
  onDeleteEvent: (eventId: string) => void;
  onPrepareNew: () => void;
  onCreateAtCurrentFrame: () => void;
}

const TEXT = {
  title: "\u5237\u602a\u7f16\u6392\u5668",
  newEvent: "\u65b0\u5efa\u4e8b\u4ef6",
  addAtCurrent: "\u5728\u5f53\u524d\u5e27\u6dfb\u52a0",
  updateEvent: "\u66f4\u65b0\u4e8b\u4ef6",
  addEvent: "\u6dfb\u52a0\u4e8b\u4ef6",
  deleteEvent: "\u5220\u9664\u4e8b\u4ef6",
  previewPrefix: "\u5c55\u5f00\u9884\u89c8\uff1a",
  previewPending: "\u65f6\u95f4\u683c\u5f0f\u5f85\u5b8c\u6210",
  interval: "\u95f4\u9694",
  time: "\u5237\u602a\u65f6\u95f4",
  enemyType: "\u654c\u4eba\u6a21\u677f",
  route: "\u8def\u7ebf",
  count: "\u6570\u91cf",
  intervalFrames: "\u95f4\u9694\u5e27",
  frames: "\u5e27"
} as const;

function getMarkerPosition(frame: number, maxFrame: number) {
  if (maxFrame <= 0) {
    return 0;
  }

  return (frame / maxFrame) * 100;
}

function safeParseFrame(time: string) {
  try {
    return parseTimeString(time);
  } catch {
    return 0;
  }
}

function safePreviewFrames(event: Pick<SpawnEventInput, "time" | "count" | "interval_frames">) {
  try {
    return expandSpawnFrames(event);
  } catch {
    return [];
  }
}

export function TimelineEditor({
  currentFrame,
  maxFrame,
  isPlaying,
  error,
  events,
  selectedEventId,
  draft,
  routes,
  enemyTypes,
  routeColors,
  onScrub,
  onSelectEvent,
  onDraftChange,
  onSaveDraft,
  onDeleteEvent,
  onPrepareNew,
  onCreateAtCurrentFrame
}: TimelineEditorProps) {
  const totalTimelineFrame = Math.max(maxFrame, ...events.flatMap((event) => safePreviewFrames(event)), currentFrame, 1);
  const previewFrames = safePreviewFrames(draft);

  const handleTimelineClick = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = bounds.width <= 0 ? 0 : (event.clientX - bounds.left) / bounds.width;
    onScrub(Math.round(totalTimelineFrame * Math.max(0, Math.min(1, ratio))));
  };

  return (
    <section className="panel panel--timeline">
      <div className="panel__header">
        <div>
          <span className="panel__eyebrow">Timeline</span>
          <h2>{TEXT.title}</h2>
        </div>
        <div className="toolbar-row toolbar-row--tight">
          <button type="button" onClick={onPrepareNew}>
            {TEXT.newEvent}
          </button>
          <button type="button" onClick={onCreateAtCurrentFrame} disabled={isPlaying || routes.length === 0 || enemyTypes.length === 0}>
            {TEXT.addAtCurrent}
          </button>
        </div>
      </div>

      <div className="timeline-bar" onClick={handleTimelineClick}>
        <div className="timeline-bar__grid">
          {Array.from({ length: 7 }, (_, index) => {
            const frame = Math.round((totalTimelineFrame / 6) * index);
            return (
              <span key={frame} className="timeline-bar__tick" style={{ left: `${(index / 6) * 100}%` }}>
                {formatFrameCount(frame)}
              </span>
            );
          })}
        </div>

        {events.map((spawnEvent) => {
          const frame = safeParseFrame(spawnEvent.time);
          const color = routeColors[spawnEvent.route_id] ?? "#5dd7ff";
          return (
            <button
              key={spawnEvent.id}
              type="button"
              className={`timeline-marker ${selectedEventId === spawnEvent.id ? "timeline-marker--active" : ""}`}
              style={{ left: `${getMarkerPosition(frame, totalTimelineFrame)}%`, backgroundColor: color }}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onSelectEvent(spawnEvent.id);
                onScrub(frame);
              }}
              title={`${spawnEvent.id} @ ${spawnEvent.time}`}
            />
          );
        })}

        <div className="timeline-cursor" style={{ left: `${getMarkerPosition(currentFrame, totalTimelineFrame)}%` }} />
      </div>

      <div className="timeline-layout">
        <div className="timeline-editor-form">
          <div className="field-grid">
            <label className="field-block">
              {TEXT.time}
              <input value={draft.time} onChange={(event) => onDraftChange({ time: event.target.value })} />
            </label>
            <label className="field-block">
              {TEXT.enemyType}
              <select value={draft.enemy_type_id} onChange={(event) => onDraftChange({ enemy_type_id: event.target.value })}>
                {enemyTypes.map((enemyType) => (
                  <option key={enemyType.id} value={enemyType.id}>
                    {enemyType.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-block">
              {TEXT.route}
              <select value={draft.route_id} onChange={(event) => onDraftChange({ route_id: event.target.value })}>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-block">
              {TEXT.count}
              <input type="number" min={1} value={draft.count ?? 1} onChange={(event) => onDraftChange({ count: Number(event.target.value) })} />
            </label>
            <label className="field-block">
              {TEXT.intervalFrames}
              <input
                type="number"
                min={0}
                value={draft.interval_frames ?? 0}
                onChange={(event) => onDraftChange({ interval_frames: Number(event.target.value) })}
              />
            </label>
          </div>

          <div className="toolbar-row">
            <button type="button" onClick={onSaveDraft} disabled={routes.length === 0 || enemyTypes.length === 0}>
              {selectedEventId ? TEXT.updateEvent : TEXT.addEvent}
            </button>
            {selectedEventId ? (
              <button type="button" className="button-danger" onClick={() => onDeleteEvent(selectedEventId)}>
                {TEXT.deleteEvent}
              </button>
            ) : null}
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          <p className="hint-text">
            {TEXT.previewPrefix}
            {previewFrames.length > 0 ? previewFrames.map((frame) => formatFrameCount(frame)).join(" / ") : TEXT.previewPending}
          </p>
        </div>

        <div className="timeline-event-list">
          {events.map((spawnEvent) => {
            const route = routes.find((item) => item.id === spawnEvent.route_id);
            const enemyType = enemyTypes.find((item) => item.id === spawnEvent.enemy_type_id);
            return (
              <button
                key={spawnEvent.id}
                type="button"
                className={`event-row ${selectedEventId === spawnEvent.id ? "event-row--active" : ""}`}
                onClick={() => {
                  onSelectEvent(spawnEvent.id);
                  onScrub(safeParseFrame(spawnEvent.time));
                }}
              >
                <div className="event-row__title">
                  <strong>{spawnEvent.time}</strong>
                  <span style={{ color: routeColors[spawnEvent.route_id] ?? "#5dd7ff" }}>{route?.name ?? spawnEvent.route_id}</span>
                </div>
                <div className="event-row__meta">
                  <span>{enemyType?.name ?? spawnEvent.enemy_type_id}</span>
                  <span>{`x${spawnEvent.count ?? 1} / ${TEXT.interval} ${spawnEvent.interval_frames ?? 0} ${TEXT.frames}`}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
