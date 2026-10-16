import { Icon } from './Icons.jsx';

const COPY = {
  dashboard: ['Dashboard', 'A clear view of deadlines, study time, and what needs attention today.'],
  tasks: ['My Tasks', 'Create, filter, and finish the work that is actually due.'],
  subjects: ['Subjects', 'Keep courses organized without burying assignments.'],
  focus: ['Focus Timer', 'Run a Pomodoro session against a real assignment.'],
  statistics: ['Statistics', 'See where your study time actually went.'],
  settings: ['Settings', 'Theme, timer lengths, notifications, and local data.'],
};

export function Header({ page, dateLabel, onNewTask, onSearch }) {
  const [title, subtitle] = COPY[page] || COPY.dashboard;
  return (
    <header className="header">
      <div>
        <h1>{title}</h1>
        <p>
          {subtitle} {dateLabel ? `Today is ${dateLabel}.` : ''}
        </p>
      </div>
      <div className="header-actions">
        <button type="button" className="btn btn-ghost" onClick={onSearch} aria-label="Open search">
          <Icon name="search" />
          Search
        </button>
        <button type="button" className="btn btn-primary" onClick={onNewTask}>
          <Icon name="plus" />
          New task
        </button>
      </div>
    </header>
  );
}
