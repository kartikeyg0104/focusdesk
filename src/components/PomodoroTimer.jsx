import { Icon } from './Icons.jsx';
import { formatClock, phaseLabel } from '../utils/formatTime.js';

export function PomodoroTimer({
  phase,
  status,
  remaining,
  duration,
  task,
  completedFocusCount,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
}) {
  const progress = duration > 0 ? 1 - remaining / duration : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  const running = status === 'running';
  const stroke = phase === 'focus' ? 'var(--accent)' : 'var(--secondary)';

  return (
    <section className={`panel timer-wrap phase-${phase}`}>
      <p className="timer-kicker">{status === 'idle' ? 'Ready' : status === 'paused' ? 'Paused' : 'In progress'}</p>
      <div className="timer-ring" role="timer" aria-live="polite" aria-label={`${phaseLabel(phase)} remaining ${formatClock(remaining)}`}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} stroke="var(--border)" strokeWidth="8" fill="none" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke={stroke}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="timer-face">
          <div>
            <div className="timer-time">{formatClock(remaining)}</div>
            <div className="timer-phase">{phaseLabel(phase)}</div>
          </div>
        </div>
      </div>
      <p className="muted">{task ? `Working on ${task.title}` : 'No task selected'}</p>
      <p className="muted">Completed focus sessions this streak: {completedFocusCount}</p>
      <div className="timer-actions">
        {status === 'idle' ? (
          <button type="button" className="btn btn-primary" onClick={onStart}>
            <Icon name="play" /> Start
          </button>
        ) : null}
        {running ? (
          <button type="button" className="btn btn-primary" onClick={onPause}>
            <Icon name="pause" /> Pause
          </button>
        ) : null}
        {status === 'paused' ? (
          <button type="button" className="btn btn-primary" onClick={onResume}>
            <Icon name="play" /> Resume
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost" onClick={onReset} disabled={status === 'idle'}>
          <Icon name="reset" /> Reset
        </button>
        <button type="button" className="btn btn-ghost" onClick={onSkip} disabled={status === 'idle'}>
          <Icon name="skip" /> Skip
        </button>
      </div>
    </section>
  );
}
