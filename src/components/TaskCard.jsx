import { formatDate, isBeforeDay } from '../utils/date.js';
import { priorityLabel, statusLabel } from '../utils/formatTime.js';

export function TaskCard({ task, subject, onOpen, onComplete, onReopen, onFocus }) {
  const overdue = Boolean(task.dueDate && task.status !== 'completed' && isBeforeDay(task.dueDate));
  const description = task.description ? task.description.trim() : '';
  const shortDescription = description.length > 140 ? `${description.slice(0, 137)}...` : description;

  return (
    <article className={`task-card ${overdue ? 'is-overdue' : ''} ${task.status === 'completed' ? 'is-complete' : ''}`}>
      <div className="task-card-top">
        <button type="button" className="task-open" onClick={() => onOpen(task)}>
          <div className="task-title">{task.title}</div>
          <div className="task-meta">
            <span className="subject-dot" style={{ background: subject?.color || 'var(--text-muted)' }} />
            {subject ? subject.name : 'Unassigned'}
            {task.dueDate ? ` · ${overdue ? 'overdue' : 'due'} ${formatDate(task.dueDate, { year: undefined })}` : ''}
          </div>
        </button>
        <div className="chips">
          <span className={`chip chip-${task.priority}`}>{priorityLabel(task.priority)}</span>
          <span className={`chip chip-${task.status}`}>{statusLabel(task.status)}</span>
        </div>
      </div>
      {shortDescription ? <p className="muted task-note">{shortDescription}</p> : null}
      <div className="row">
        <div className="task-meta">
          {task.estimatedMinutes ? `${task.estimatedMinutes} min estimated` : 'No estimate'}
        </div>
        <div className="header-actions">
          {onFocus && task.status !== 'completed' ? (
            <button type="button" className="btn btn-ghost" onClick={() => onFocus(task)}>
              Start focus
            </button>
          ) : null}
          {task.status === 'completed' ? (
            <button type="button" className="btn btn-ghost" onClick={() => onReopen(task)}>
              Reopen
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => onComplete(task)}>
              Complete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
