import type { ReactNode } from "react";

interface EnemyTypesPageProps {
  selectedEnemyName: string;
  totalTemplates: number;
  editor: ReactNode;
}

const TEXT = {
  title: "\u654c\u4eba\u6a21\u677f\u5de5\u4f5c\u533a",
  summary: "\u4f7f\u7528\u5355\u72ec\u5de5\u4f5c\u9875\u7ef4\u62a4\u6a21\u677f\u5e93\uff0c\u628a\u5e38\u7528\u79fb\u52a8\u53c2\u6570\u4e0e\u9ad8\u7ea7\u53c2\u6570\u5206\u5f00\u7f16\u8f91\u3002",
  selected: "\u5f53\u524d\u6a21\u677f",
  total: "\u6a21\u677f\u6570"
} as const;

export function EnemyTypesPage({ selectedEnemyName, totalTemplates, editor }: EnemyTypesPageProps) {
  return (
    <section className="page">
      <header className="page__intro">
        <div>
          <span className="panel__eyebrow">Enemies</span>
          <h2>{TEXT.title}</h2>
          <p>{TEXT.summary}</p>
        </div>
        <div className="page__chips">
          <span className="status-chip">{`${TEXT.selected} ${selectedEnemyName}`}</span>
          <span className="status-chip">{`${TEXT.total} ${totalTemplates}`}</span>
        </div>
      </header>

      <div className="page-single__body">{editor}</div>
    </section>
  );
}
