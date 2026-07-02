import type { MouseEvent } from "react";
import type { SpawnEventInput } from "../engine/models";
import { formatFrameCount, parseTimeString } from "../engine/utils/time";

interface PreviewTimelineStripProps {
  currentFrame: number;
  maxFrame: number;
  isPlaying: boolean;
  events: SpawnEventInput[];
  routeColors: Record<string, string>;
  canCreateAtCurrentFrame: boolean;
  onScrub: (frame: number) => void;
  onOpenPlanner: () => void;
  onCreateAtCurrentFrame: () => void;
}

const TEXT = {
  title: "\u8f7b\u91cf\u65f6\u95f4\u6761",
  openPlanner: "\u6253\u5f00\u7f16\u6392\u9875",
  createAtCurrent: "\u5728\u5f53\u524d\u5e27\u6dfb\u52a0",
  upcoming: "\u5237\u602a\u4e8b\u4ef6"
} as const;

function safeParseTime(time: string) {
  try {
    return parseTimeString(time);
  } catch {
    return 0;
  }
}

function getMarkerPosition(frame: number, maxFrame: number) {
  if (maxFrame <= 0) {
    return 0;
  }

  return (frame / maxFrame) * 100;
}

export function PreviewTimelineStrip({
  currentFrame,
  maxFrame,
  isPlaying,
  events,
  routeColors,
  canCreateAtCurrentFrame,
  onScrub,
  onOpenPlanner,
  onCreateAtCurrentFrame
}: PreviewTimelineStripProps) {
  const timelineMax = Math.max(currentFrame, maxFrame, ...events.map((event) => safeParseTime(event.time)), 1);

  const handleTimelineClick = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = bounds.width <= 0 ? 0 : (event.clientX - bounds.left) / bounds.width;
    onScrub(Math.round(timelineMax * Math.max(0, Math.min(1, ratio))));
  };

  return (
    <section className="panel panel--timelineStrip">
      <div className="panel__header panel__header--compact">
        <div>
          <span className="panel__eyebrow">Timeline</span>
          <h2>{TEXT.title}</h2>
        </div>
        <div className="toolbar-row toolbar-row--tight">
          <button type="button" onClick={onOpenPlanner}>
            {TEXT.openPlanner}
          </button>
          <button type="button" onClick={onCreateAtCurrentFrame} disabled={isPlaying || !canCreateAtCurrentFrame}>
            {TEXT.createAtCurrent}
          </button>
        </div>
      </div>

      <div className="timeline-bar timeline-bar--compact" onClick={handleTimelineClick}>
        <div className="timeline-bar__grid">
          {Array.from({ length: 5 }, (_, index) => {
            const frame = Math.round((timelineMax / 4) * index);
            return (
              <span key={frame} className="timeline-bar__tick" style={{ left: `${(index / 4) * 100}%` }}>
                {formatFrameCount(frame)}
              </span>
            );
          })}
        </div>

        {events.map((spawnEvent) => {
          const frame = safeParseTime(spawnEvent.time);
          return (
            <span
              key={spawnEvent.id}
              className="timeline-marker timeline-marker--compact"
              style={{
                left: `${getMarkerPosition(frame, timelineMax)}%`,
                backgroundColor: routeColors[spawnEvent.route_id] ?? "#5dd7ff"
              }}
              title={`${spawnEvent.time} / ${spawnEvent.id}`}
            />
          );
        })}

        <div className="timeline-cursor" style={{ left: `${getMarkerPosition(currentFrame, timelineMax)}%` }} />
      </div>

      <p className="hint-text">{`${TEXT.upcoming} ${events.length}`}</p>
    </section>
  );
}
