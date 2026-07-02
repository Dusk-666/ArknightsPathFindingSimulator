import type { ReactNode } from "react";

interface ToolsPageProps {
  debugPathLabel: string;
  query: ReactNode;
  debug: ReactNode;
  json: ReactNode;
}

const TEXT = {
  title: "\u5de5\u5177\u4e0e\u8c03\u8bd5",
  summary: "\u6307\u5b9a\u5e27\u67e5\u8be2\u3001Debug \u53e0\u5c42\u5f00\u5173\u3001JSON \u8fdb\u51fa\u53e3\u90fd\u653e\u5728\u5355\u72ec\u9875\u9762\uff0c\u4e0d\u6253\u6270\u4e3b\u5de5\u4f5c\u533a\u3002",
  pathMap: "\u8c03\u8bd5\u8def\u5f84\u56fe"
} as const;

export function ToolsPage({ debugPathLabel, query, debug, json }: ToolsPageProps) {
  return (
    <section className="page">
      <header className="page__intro">
        <div>
          <span className="panel__eyebrow">Tools</span>
          <h2>{TEXT.title}</h2>
          <p>{TEXT.summary}</p>
        </div>
        <div className="page__chips">
          <span className="status-chip">{`${TEXT.pathMap} ${debugPathLabel}`}</span>
        </div>
      </header>

      <div className="page-tools__grid">
        <div className="page-tools__query">{query}</div>
        <div className="page-tools__debug">{debug}</div>
        <div className="page-tools__json">{json}</div>
      </div>
    </section>
  );
}
