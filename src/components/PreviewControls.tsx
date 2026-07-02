import { formatFrameCount } from "../engine/utils/time";

interface PreviewControlsProps {
  currentFrame: number;
  maxFrame: number;
  isPlaying: boolean;
  doubleSpeed: boolean;
  isCompiling: boolean;
  onPlayPause: () => void;
  onToggleDoubleSpeed: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onScrub: (frame: number) => void;
}

const TEXT = {
  title: "\u5b9e\u65f6\u64ad\u653e",
  syncing: "\u91cd\u65b0\u7f16\u8bd1\u4e2d",
  synced: "\u5df2\u540c\u6b65",
  play: "\u64ad\u653e",
  pause: "\u6682\u505c",
  stepBack: "\u5355\u5e27\u540e\u9000",
  stepForward: "\u5355\u5e27\u524d\u8fdb",
  total: "\u603b\u65f6\u957f"
} as const;

export function PreviewControls({
  currentFrame,
  maxFrame,
  isPlaying,
  doubleSpeed,
  isCompiling,
  onPlayPause,
  onToggleDoubleSpeed,
  onStepBackward,
  onStepForward,
  onScrub
}: PreviewControlsProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="panel__eyebrow">Playback</span>
          <h2>{TEXT.title}</h2>
        </div>
        <span className={`status-pill ${isCompiling ? "status-pill--busy" : ""}`}>
          {isCompiling ? TEXT.syncing : TEXT.synced}
        </span>
      </div>

      <div className="toolbar-row">
        <button type="button" onClick={onPlayPause}>
          {isPlaying ? TEXT.pause : TEXT.play}
        </button>
        <button type="button" onClick={onToggleDoubleSpeed} className={doubleSpeed ? "is-active" : ""}>
          2x
        </button>
        <button type="button" onClick={onStepBackward}>
          {TEXT.stepBack}
        </button>
        <button type="button" onClick={onStepForward}>
          {TEXT.stepForward}
        </button>
      </div>

      <label className="range-control">
        <input
          type="range"
          min={0}
          max={Math.max(1, maxFrame)}
          value={Math.min(currentFrame, Math.max(1, maxFrame))}
          onChange={(event) => onScrub(Number(event.target.value))}
        />
      </label>

      <div className="time-meta">
        <strong>{formatFrameCount(currentFrame)}</strong>
        <span>{`${TEXT.total} ${formatFrameCount(maxFrame)}`}</span>
      </div>
    </section>
  );
}
