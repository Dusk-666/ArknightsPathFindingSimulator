import type { ReactNode } from "react";

interface SpawnPlannerPageProps {
  currentFrameLabel: string;
  eventCount: number;
  instanceCount: number;
  timeline: ReactNode;
}

const TEXT = {
  title: "\u5237\u602a\u7f16\u6392\u5de5\u4f5c\u533a",
  summary: "\u5b8c\u6574\u65f6\u95f4\u8f74\u3001\u6279\u91cf\u751f\u6210\u548c\u4e8b\u4ef6\u7f16\u8f91\u90fd\u96c6\u4e2d\u5728\u8fd9\u4e2a\u9875\u9762\uff0c\u907f\u514d\u9996\u9875\u88ab\u5927\u578b\u8868\u5355\u6324\u538b\u3002",
  currentFrame: "\u5f53\u524d\u5e27",
  events: "\u4e8b\u4ef6",
  instances: "\u5b9e\u4f8b"
} as const;

export function SpawnPlannerPage({
  currentFrameLabel,
  eventCount,
  instanceCount,
  timeline
}: SpawnPlannerPageProps) {
  return (
    <section className="page">
      <header className="page__intro">
        <div>
          <span className="panel__eyebrow">Spawns</span>
          <h2>{TEXT.title}</h2>
          <p>{TEXT.summary}</p>
        </div>
        <div className="page__chips">
          <span className="status-chip">{`${TEXT.currentFrame} ${currentFrameLabel}`}</span>
          <span className="status-chip">{`${TEXT.events} ${eventCount}`}</span>
          <span className="status-chip">{`${TEXT.instances} ${instanceCount}`}</span>
        </div>
      </header>

      <div className="page-spawn__body">{timeline}</div>
    </section>
  );
}
