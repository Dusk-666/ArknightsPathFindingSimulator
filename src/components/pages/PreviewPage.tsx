import type { ReactNode } from "react";

interface PreviewPageProps {
  currentFrameLabel: string;
  activeRouteName: string;
  activeEnemyName: string;
  brushLabel: string;
  stage: ReactNode;
  side: ReactNode;
  timeline: ReactNode;
}

const TEXT = {
  currentFrame: "\u5f53\u524d\u5e27",
  activeRoute: "\u5f53\u524d\u8def\u7ebf",
  activeEnemy: "\u5f53\u524d\u6a21\u677f",
  activeBrush: "\u5f53\u524d\u753b\u7b14"
} as const;

export function PreviewPage({
  currentFrameLabel,
  activeRouteName,
  activeEnemyName,
  brushLabel,
  stage,
  side,
  timeline
}: PreviewPageProps) {
  return (
    <section className="page">
      <header className="page__intro">
        <span className="panel__eyebrow">Preview</span>
        <div className="page__chips">
          <span className="status-chip">{`${TEXT.currentFrame} ${currentFrameLabel}`}</span>
          <span className="status-chip">{`${TEXT.activeRoute} ${activeRouteName}`}</span>
          <span className="status-chip">{`${TEXT.activeEnemy} ${activeEnemyName}`}</span>
          <span className="status-chip">{`${TEXT.activeBrush} ${brushLabel}`}</span>
        </div>
      </header>

      <div className="page-preview__layout">
        <div className="page-preview__stage">{stage}</div>
        <div className="page-preview__side">{side}</div>
      </div>

      <div className="page-preview__timeline">{timeline}</div>
    </section>
  );
}
