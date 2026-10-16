import { Icon } from './Icons.jsx';
import { formatDuration } from '../utils/formatTime.js';

const LINKS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'tasks', label: 'My Tasks', icon: 'tasks' },
  { id: 'subjects', label: 'Subjects', icon: 'subjects' },
  { id: 'focus', label: 'Focus Timer', icon: 'focus' },
  { id: 'statistics', label: 'Statistics', icon: 'statistics' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar({ page, onNavigate, studySeconds, openTasks, version }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Icon name="logo" />
        </div>
        <div className="brand-copy">
          <div className="brand-name">FocusDesk</div>
          <div className="brand-tag">Student workspace</div>
        </div>
      </div>
      <nav className="nav-list" aria-label="Main">
        {LINKS.map((link) => (
          <button
            key={link.id}
            type="button"
            className={`nav-item ${page === link.id ? 'active' : ''}`}
            onClick={() => onNavigate(link.id)}
            aria-current={page === link.id ? 'page' : undefined}
          >
            <Icon name={link.icon} />
            <span>{link.label}</span>
          </button>
        ))}
      </nav>
      <section className="sidebar-summary">
        <h2>Today</h2>
        <div className="summary-row">
          <span>Study time</span>
          <strong>{formatDuration(studySeconds)}</strong>
        </div>
        <div className="summary-row">
          <span>Open tasks</span>
          <strong>{openTasks}</strong>
        </div>
      </section>
      <div className="sidebar-foot">
        <span>FocusDesk v{version}</span>
      </div>
    </aside>
  );
}
