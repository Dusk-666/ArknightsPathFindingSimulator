import type { DebugToggles } from "../engine/models";

interface DebugPanelProps {
  toggles: DebugToggles;
  debugPathLabel: string;
  onToggle: (key: keyof DebugToggles) => void;
}

const TOGGLE_ITEMS: Array<{ key: keyof DebugToggles; label: string }> = [
  { key: "showNextNode", label: "\u663e\u793a nextNode" },
  { key: "showDistanceToTarget", label: "\u663e\u793a distanceToTarget" },
  { key: "showDistanceToEnd", label: "\u663e\u793a distanceToEnd" },
  { key: "showCursorPos", label: "\u663e\u793a cursorPos" },
  { key: "showFootPos", label: "\u663e\u793a footPos" },
  { key: "showAvoidanceForce", label: "\u663e\u793a\u907f\u969c\u5411\u91cf" },
  { key: "showInertiaVelocity", label: "\u663e\u793a\u60ef\u6027\u901f\u5ea6" }
];

const TEXT = {
  title: "\u8c03\u8bd5\u53e0\u5c42"
} as const;

export function DebugPanel({ toggles, debugPathLabel, onToggle }: DebugPanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="panel__eyebrow">Debug</span>
          <h2>{TEXT.title}</h2>
        </div>
        <span className="panel__badge">{debugPathLabel}</span>
      </div>

      <div className="checkbox-grid">
        {TOGGLE_ITEMS.map((item) => (
          <label key={item.key} className="checkbox-item">
            <input type="checkbox" checked={toggles[item.key]} onChange={() => onToggle(item.key)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
