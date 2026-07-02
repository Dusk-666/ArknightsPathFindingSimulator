interface JsonWorkbenchProps {
  expanded: boolean;
  value: string;
  error: string | null;
  onToggle: () => void;
  onChange: (value: string) => void;
  onSyncFromScenario: () => void;
  onApply: () => void;
}

const TEXT = {
  title: "JSON \u5bfc\u5165\u5bfc\u51fa",
  collapse: "\u6536\u8d77",
  expand: "\u5c55\u5f00",
  sync: "\u540c\u6b65\u5f53\u524d\u6570\u636e",
  apply: "\u4ece JSON \u5e94\u7528",
  hint:
    "\u9ad8\u7ea7\u6a21\u5f0f\u4fdd\u7559\u5b8c\u6574 JSON \u51fa\u5165\u53e3\uff0c\u4f46\u9ed8\u8ba4\u5de5\u4f5c\u6d41\u5df2\u7ecf\u4e0d\u518d\u4f9d\u8d56\u624b\u5199 JSON\u3002"
} as const;

export function JsonWorkbench({
  expanded,
  value,
  error,
  onToggle,
  onChange,
  onSyncFromScenario,
  onApply
}: JsonWorkbenchProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="panel__eyebrow">Advanced</span>
          <h2>{TEXT.title}</h2>
        </div>
        <button type="button" className="button-ghost" onClick={onToggle}>
          {expanded ? TEXT.collapse : TEXT.expand}
        </button>
      </div>

      {expanded ? (
        <>
          <div className="toolbar-row">
            <button type="button" onClick={onSyncFromScenario}>
              {TEXT.sync}
            </button>
            <button type="button" onClick={onApply}>
              {TEXT.apply}
            </button>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <textarea className="json-editor" value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} />
        </>
      ) : (
        <p className="hint-text">{TEXT.hint}</p>
      )}
    </section>
  );
}
