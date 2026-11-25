import { Icon } from './Icons.jsx';
import { SubjectDot } from './ui.jsx';
import { dueInfo, formatDuration, priorityLabel } from '../utils/formatTime.js';
import { subtaskProgress } from '../utils/insights.js';

export function TaskMeta({ task, subject, focusSeconds = 0, compact = false }) {
  const due = dueInfo(task);
  const subtasks = subtaskProgress(task);
  return (
    <div className="task-meta">
      {subject ? (
        <span className="meta-item">
          <SubjectDot color={subject.color} />
          {subject.name}
        </span>
      ) : null}
      {due ? (
        <span className={`meta-item tone-${due.tone}`}>
          <Icon name="calendar" size={12} />
          {due.label}
        </span>
      ) : null}
      {subtasks.total > 0 ? (
        <span className={`meta-item ${subtasks.done === subtasks.total ? 'tone-success' : ''}`}>
          <Icon name="tasks" size={12} />
          {subtasks.done}/{subtasks.total}
        </span>
      ) : null}
      {task.estimatedMinutes || focusSeconds ? (
        <span className="meta-item">
          <Icon name="clock" size={12} />
          {focusSeconds ? formatDuration(focusSeconds) : '0m'}
          {task.estimatedMinutes ? ` / ${formatDuration(task.estimatedMinutes * 60)}` : ''}
        </span>
      ) : null}
      {!compact ? (task.tags || []).map((tag) => (
        <span key={tag} className="tag">
          #{tag}
        </span>
      )) : null}
    </div>
  );
}

export function TaskRow({ task, subject, focusSeconds, index = 0, onOpen, onToggle, onFocus, onDelete }) {
  const done = task.status === 'completed';
  const due = dueInfo(task);
  return (
    <article
      className={`task-row priority-${task.priority} ${done ? 'is-done' : ''} ${due?.tone === 'danger' ? 'is-overdue' : ''}`}
      style={{ '--i': Math.min(index, 14) }}
    >
      <button
        type="button"
        className={`check ${done ? 'is-checked' : ''}`}
        onClick={() => onToggle(task)}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        aria-pressed={done}
      >
        <Icon name="check" size={13} strokeWidth={3} />
      </button>
      <button type="button" className="task-body" onClick={() => onOpen(task)}>
        <span className="task-title">
          <span className="task-title-text">{task.title}</span>
          {task.status === 'in_progress' ? <span className="pill pill-progress">In progress</span> : null}
          {task.priority === 'high' && !done ? (
            <span className="pill pill-high">
              <Icon name="flag" size={11} />
              {priorityLabel(task.priority)}
            </span>
          ) : null}
        </span>
        <TaskMeta task={task} subject={subject} focusSeconds={focusSeconds} />
      </button>
      <div className="row-actions">
        {!done && onFocus ? (
          <button type="button" className="icon-btn" onClick={() => onFocus(task)} aria-label={`Focus on ${task.title}`} data-tip="Start focus">
            <Icon name="play" size={13} />
          </button>
        ) : null}
        <button type="button" className="icon-btn" onClick={() => onOpen(task)} aria-label={`Edit ${task.title}`} data-tip="Edit">
          <Icon name="edit" size={14} />
        </button>
        {onDelete ? (
          <button type="button" className="icon-btn icon-btn-danger" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} data-tip="Delete">
            <Icon name="trash" size={14} />
          </button>
        ) : null}
      </div>
    </article>
  );
}
