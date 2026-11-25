import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';

// Counts up to a number when it changes, so stats feel alive instead of snapping.
export function AnimatedNumber({ value, format = (number) => Math.round(number), duration = 700 }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to || document.documentElement.dataset.motion === 'reduced') {
      fromRef.current = to;
      setDisplay(to);
      return undefined;
    }
    let frame;
    const started = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      fromRef.current = current;
      setDisplay(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return <>{format(display)}</>;
}

export function ProgressRing({ value, size = 56, stroke = 6, children, className = '', color }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, value || 0));
  return (
    <div className={`ring ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={color ? { stroke: color } : undefined}
        />
      </svg>
      {children ? <div className="ring-center">{children}</div> : null}
    </div>
  );
}

export function Segmented({ options, value, onChange, label, size = 'md' }) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div
      className={`segmented segmented-${size}`}
      role="radiogroup"
      aria-label={label}
      style={{ '--count': options.length, '--index': index }}
    >
      <span className="segmented-thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={option.value === value ? 'is-active' : ''}
          onClick={() => onChange(option.value)}
          disabled={option.disabled}
          title={option.title}
        >
          {option.icon ? <Icon name={option.icon} size={15} /> : null}
          {option.label ? <span>{option.label}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={`switch-row ${disabled ? 'is-disabled' : ''}`}>
      <span className="switch-copy">
        <span>{label}</span>
        {hint ? <span className="muted small">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

export function EmptyState({ icon = 'sparkle', title, body, action }) {
  return (
    <div className="empty-state">
      <div className="empty-art">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action}
    </div>
  );
}

export function StatCard({ icon, label, value, hint, tone = 'accent', onClick, index = 0, children }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`card stat-card spot tone-${tone} ${onClick ? 'is-clickable' : ''}`}
      style={{ '--i': index }}
      onClick={onClick}
    >
      <div className="stat-top">
        <span className="stat-icon">
          <Icon name={icon} size={17} />
        </span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
      {children}
    </Tag>
  );
}

export function Kbd({ children }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function SubjectDot({ color, size = 8 }) {
  return <span className="dot" style={{ background: color || 'var(--text-faint)', width: size, height: size }} />;
}
