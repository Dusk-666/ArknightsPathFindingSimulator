import type { ReactNode } from "react";

interface RouteWorkspacePageProps {
  routeName: string;
  checkpointCount: number;
  interactionLabel: string;
  stage: ReactNode;
  side: ReactNode;
}

const TEXT = {
  route: "\u8def\u7ebf",
  checkpoints: "\u68c0\u67e5\u70b9",
  interaction: "\u5f53\u524d\u4ea4\u4e92"
} as const;

export function RouteWorkspacePage({
  routeName,
  checkpointCount,
  interactionLabel,
  stage,
  side
}: RouteWorkspacePageProps) {
  return (
    <section className="page">
      <header className="page__intro">
        <span className="panel__eyebrow">Routes</span>
        <div className="page__chips">
          <span className="status-chip">{`${TEXT.route} ${routeName}`}</span>
          <span className="status-chip">{`${TEXT.checkpoints} ${checkpointCount}`}</span>
          <span className="status-chip">{`${TEXT.interaction} ${interactionLabel}`}</span>
        </div>
      </header>

      <div className="page-route__layout">
        <div className="page-route__stage">{stage}</div>
        <div className="page-route__side">{side}</div>
      </div>
    </section>
  );
}
