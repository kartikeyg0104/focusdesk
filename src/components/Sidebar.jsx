import { Icon } from './Icons.jsx';
import { ProgressRing } from './ui.jsx';
import { formatClock, formatDuration, phaseLabel } from '../utils/formatTime.js';
import { useTimerClock } from '../hooks/usePomodoro.js';

export const NAV_LINKS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'tasks', label: 'Tasks', icon: 'tasks' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'focus', label: 'Focus', icon: 'focus' },
  { id: 'notes', label: 'Notes', icon: 'notes' },
  { id: 'subjects', label: 'Subjects', icon: 'subjects' },
  { id: 'statistics', label: 'Insights', icon: 'statistics' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function MiniTimer({ timer, onOpen }) {
  const { remaining, progress } = useTimerClock(timer);
  const running = timer.state.status === 'running';
  return (
    <div className={`mini-timer phase-${timer.state.phase} ${running ? 'is-running' : ''}`}>
      <button type="button" className="mini-timer-main" onClick={onOpen} title="Open the focus timer">
        <ProgressRing value={progress} size={38} stroke={4} />
        <span className="mini-timer-copy">
          <strong>{formatClock(remaining)}</strong>
          <span>{running ? phaseLabel(timer.state.phase) : 'Paused'}</span>
        </span>
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={timer.toggle}
        aria-label={running ? 'Pause timer' : 'Resume timer'}
      >
        <Icon name={running ? 'pause' : 'play'} size={14} />
      </button>
    </div>
  );
}

export function Sidebar({ page, onNavigate, collapsed, onToggle, badges, timer, goal, streak }) {
  const activeIndex = NAV_LINKS.findIndex((link) => link.id === page);
  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <Icon name="logo" size={20} strokeWidth={2} />
        </div>
        <div className="brand-copy">
          <div className="brand-name">FocusDesk</div>
          <div className="brand-tag">Study, on purpose</div>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main" style={{ '--active': activeIndex }}>
        <span className="nav-indicator" aria-hidden="true" />
        {NAV_LINKS.map((link, index) => (
          <button
            key={link.id}
            type="button"
            className={`nav-item ${page === link.id ? 'is-active' : ''}`}
            onClick={() => onNavigate(link.id)}
            aria-current={page === link.id ? 'page' : undefined}
            data-tip={collapsed ? link.label : undefined}
            data-tip-side="right"
            style={{ '--i': index }}
          >
            <Icon name={link.icon} size={18} />
            <span className="nav-label">{link.label}</span>
            {badges[link.id] ? (
              <span className={`nav-badge ${badges[link.id].tone || ''}`}>{badges[link.id].count}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {timer.state.status !== 'idle' ? <MiniTimer timer={timer} onOpen={() => onNavigate('focus')} /> : null}

        <button type="button" className="goal-card" onClick={() => onNavigate('statistics')} title="Open insights">
          <ProgressRing value={goal.progress} size={44} stroke={5}>
            <Icon name={goal.progress >= 1 ? 'check' : 'target'} size={15} />
          </ProgressRing>
          <span className="goal-copy">
            <strong>
              {formatDuration(goal.seconds)} <span>/ {formatDuration(goal.targetSeconds)}</span>
            </strong>
            <span className="goal-sub">
              <Icon name="flame" size={12} />
              {streak > 0 ? `${streak} day streak` : 'Start a streak today'}
            </span>
          </span>
        </button>

        <button type="button" className="collapse-btn" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name="sidebar" size={16} />
          <span className="nav-label">Collapse</span>
        </button>
      </div>
    </aside>
  );
}
