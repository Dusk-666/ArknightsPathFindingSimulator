import type { QueryResponse } from "../engine/simulation/query";

interface ResultPanelProps {
  value: string;
  error: string | null;
  response: QueryResponse;
  onChange: (value: string) => void;
  onQuery: () => void;
}

const TEXT = {
  title: "\u6307\u5b9a\u65f6\u523b\u67e5\u8be2",
  currentEnemies: "\u4e2a\u5728\u573a\u5355\u4f4d",
  placeholder: "\u4f8b\u5982\uff1a2\u79d28\u5e27",
  jump: "\u8df3\u8f6c"
} as const;

export function ResultPanel({ value, error, response, onChange, onQuery }: ResultPanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="panel__eyebrow">Query</span>
          <h2>{TEXT.title}</h2>
        </div>
        <span className="panel__badge">{`${response.items.length} ${TEXT.currentEnemies}`}</span>
      </div>

      <div className="inline-form">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={TEXT.placeholder} />
        <button type="button" onClick={onQuery}>
          {TEXT.jump}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      <pre className="result-panel">{response.text}</pre>
    </section>
  );
}
