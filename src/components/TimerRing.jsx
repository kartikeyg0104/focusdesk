import { formatClock, phaseLabel } from '../utils/formatTime.js';
import { useTimerClock } from '../hooks/usePomodoro.js';

export function TimerRing({ timer, size = 320, caption }) {
  const { remaining, progress } = useTimerClock(timer);
  const { phase, status } = timer.state;
  const stroke = 10;
  const radius = (size - stroke) / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  // The glowing dot rides the end of the progress arc.
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const dotX = size / 2 + radius * Math.cos(angle);
  const dotY = size / 2 + radius * Math.sin(angle);

  return (
    <div
      className={`timer-ring phase-${phase} status-${status}`}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${phaseLabel(phase)}, ${formatClock(remaining)} remaining`}
    >
      <div className="timer-glow" aria-hidden="true" />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="timer-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--phase-a)" />
            <stop offset="100%" stopColor="var(--phase-b)" />
          </linearGradient>
        </defs>
        <circle className="timer-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        <circle
          className="timer-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          stroke="url(#timer-gradient)"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {status !== 'idle' ? <circle className="timer-dot" cx={dotX} cy={dotY} r={7} /> : null}
      </svg>
      <div className="timer-face">
        <span className="timer-phase">{phaseLabel(phase)}</span>
        <span className="timer-time">{formatClock(remaining)}</span>
        <span className="timer-caption">{caption}</span>
      </div>
    </div>
  );
}
