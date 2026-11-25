import { Icon } from './Icons.jsx';
import { Kbd } from './ui.jsx';

const COPY = {
  dashboard: ['Dashboard', null],
  tasks: ['Tasks', 'Everything you need to finish, in one place.'],
  calendar: ['Calendar', 'Deadlines and study time across the month.'],
  focus: ['Focus', 'One block, one task. Everything else can wait.'],
  notes: ['Notes', 'Lecture notes and loose thoughts, saved as you type.'],
  subjects: ['Subjects', 'Your courses, and how much time each one is getting.'],
  statistics: ['Insights', 'Where your study time actually went.'],
  settings: ['Settings', 'Make FocusDesk yours.'],
};

export function TopBar({ page, greeting, dateLabel, isMac, isDark, onSearch, onNewTask, onToggleTheme }) {
  const [title, subtitle] = COPY[page] || COPY.dashboard;
  return (
    <header className="topbar">
      <div className="topbar-title" key={page}>
        <h1>{page === 'dashboard' ? greeting : title}</h1>
        <p>{page === 'dashboard' ? dateLabel : subtitle}</p>
      </div>
      <div className="topbar-actions">
        <button type="button" className="search-trigger" onClick={onSearch}>
          <Icon name="search" size={15} />
          <span>Search or jump to…</span>
          <Kbd>{isMac ? '⌘' : 'Ctrl'} K</Kbd>
        </button>
        <button
          type="button"
          className="icon-btn icon-btn-lg"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          data-tip={isDark ? 'Light theme' : 'Dark theme'}
        >
          <Icon name={isDark ? 'sun' : 'moon'} size={17} />
        </button>
        <button type="button" className="btn btn-primary" onClick={onNewTask}>
          <Icon name="plus" size={16} strokeWidth={2.4} />
          New task
        </button>
      </div>
    </header>
  );
}
