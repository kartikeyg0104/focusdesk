import { useId, useState } from 'react';
import { Icon } from './Icons.jsx';
import { Segmented } from './ui.jsx';
import { formatDateInput } from '../utils/date.js';

const EMPTY = {
  title: '',
  description: '',
  subjectId: '',
  priority: 'medium',
  status: 'todo',
  dueDate: '',
  estimatedMinutes: '',
  subtasks: [],
  tags: [],
};

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
}

const DATE_SHORTCUTS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
];
const ESTIMATES = [15, 30, 60, 120];

export function TaskForm({ task, defaults, subjects, submitLabel, onSubmit, onCancel, onDelete }) {
  const formId = useId();
  const [values, setValues] = useState(() =>
    task
      ? {
          title: task.title,
          description: task.description || '',
          subjectId: task.subjectId || '',
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate ? formatDateInput(task.dueDate) : '',
          estimatedMinutes: task.estimatedMinutes ?? '',
          subtasks: (task.subtasks || []).map((item) => ({ ...item })),
          tags: task.tags || [],
        }
      : { ...EMPTY, ...defaults }
  );
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function addSubtask() {
    const title = subtaskDraft.trim();
    if (!title) return;
    update('subtasks', [...values.subtasks, { id: crypto.randomUUID(), title, done: false }]);
    setSubtaskDraft('');
  }

  function addTag() {
    const tag = tagDraft.trim().replace(/^#+/, '').toLowerCase();
    setTagDraft('');
    if (!tag || values.tags.includes(tag)) return;
    update('tags', [...values.tags, tag].slice(0, 8));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (!values.title.trim()) {
      setError('Give the task a title.');
      return;
    }
    setBusy(true);
    setError('');
    // Anything still sitting in the "add" inputs is included rather than lost.
    const pendingSubtask = subtaskDraft.trim();
    const pendingTag = tagDraft.trim().replace(/^#+/, '').toLowerCase();
    try {
      await onSubmit({
        title: values.title,
        description: values.description,
        subjectId: values.subjectId || null,
        priority: values.priority,
        status: values.status,
        dueDate: values.dueDate ? new Date(`${values.dueDate}T12:00:00`).toISOString() : null,
        estimatedMinutes: values.estimatedMinutes === '' ? null : Number(values.estimatedMinutes),
        subtasks: pendingSubtask ? [...values.subtasks, { title: pendingSubtask, done: false }] : values.subtasks,
        tags: pendingTag && !values.tags.includes(pendingTag) ? [...values.tags, pendingTag] : values.tags,
      });
    } catch (submitError) {
      setError(submitError.message);
      setBusy(false);
    }
  }

  const doneCount = values.subtasks.filter((item) => item.done).length;

  return (
    <form className="form" onSubmit={handleSubmit}>
      <input
        className="title-input"
        value={values.title}
        onChange={(event) => update('title', event.target.value)}
        placeholder="What needs to get done?"
        aria-label="Title"
        aria-invalid={Boolean(error) && !values.title.trim()}
        data-autofocus
      />
      <textarea
        className="description-input"
        value={values.description}
        onChange={(event) => update('description', event.target.value)}
        placeholder="Add details, links, or notes…"
        aria-label="Description"
        rows={3}
      />

      <div className="form-row">
        <div className="field">
          <label htmlFor={`${formId}-subject`}>Subject</label>
          <select id={`${formId}-subject`} value={values.subjectId} onChange={(event) => update('subjectId', event.target.value)}>
            <option value="">No subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="label">Priority</span>
          <Segmented
            label="Priority"
            value={values.priority}
            onChange={(value) => update('priority', value)}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor={`${formId}-due`}>Due date</label>
          <input id={`${formId}-due`} type="date" value={values.dueDate} onChange={(event) => update('dueDate', event.target.value)} />
          <div className="chip-row">
            {DATE_SHORTCUTS.map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                className={`chip-btn ${values.dueDate === dateOffset(shortcut.days) ? 'is-active' : ''}`}
                onClick={() => update('dueDate', dateOffset(shortcut.days))}
              >
                {shortcut.label}
              </button>
            ))}
            {values.dueDate ? (
              <button type="button" className="chip-btn chip-icon" onClick={() => update('dueDate', '')} aria-label="Clear due date">
                <Icon name="close" size={11} strokeWidth={2.4} />
              </button>
            ) : null}
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${formId}-estimate`}>Estimate (minutes)</label>
          <input
            id={`${formId}-estimate`}
            type="number"
            min="0"
            max="1440"
            placeholder="e.g. 45"
            value={values.estimatedMinutes}
            onChange={(event) => update('estimatedMinutes', event.target.value)}
          />
          <div className="chip-row">
            {ESTIMATES.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={`chip-btn ${Number(values.estimatedMinutes) === minutes ? 'is-active' : ''}`}
                onClick={() => update('estimatedMinutes', minutes)}
              >
                {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {task ? (
        <div className="field">
          <span className="label">Status</span>
          <Segmented
            label="Status"
            value={values.status}
            onChange={(value) => update('status', value)}
            options={[
              { value: 'todo', label: 'To do' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'completed', label: 'Done' },
            ]}
          />
        </div>
      ) : null}

      <div className="field">
        <span className="label">
          Subtasks
          {values.subtasks.length > 0 ? (
            <span className="muted">
              {' '}
              · {doneCount}/{values.subtasks.length}
            </span>
          ) : null}
        </span>
        {values.subtasks.length > 0 ? (
          <div className="subtask-progress">
            <span style={{ width: `${(doneCount / values.subtasks.length) * 100}%` }} />
          </div>
        ) : null}
        <ul className="subtask-list">
          {values.subtasks.map((item, index) => (
            <li key={item.id || index} className={item.done ? 'is-done' : ''}>
              <button
                type="button"
                className={`check check-sm ${item.done ? 'is-checked' : ''}`}
                aria-label={item.done ? `Mark ${item.title} not done` : `Mark ${item.title} done`}
                aria-pressed={item.done}
                onClick={() =>
                  update(
                    'subtasks',
                    values.subtasks.map((other, otherIndex) => (otherIndex === index ? { ...other, done: !other.done } : other))
                  )
                }
              >
                <Icon name="check" size={11} strokeWidth={3} />
              </button>
              <input
                value={item.title}
                aria-label={`Subtask ${index + 1}`}
                onChange={(event) =>
                  update(
                    'subtasks',
                    values.subtasks.map((other, otherIndex) => (otherIndex === index ? { ...other, title: event.target.value } : other))
                  )
                }
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove ${item.title}`}
                onClick={() => update('subtasks', values.subtasks.filter((_, otherIndex) => otherIndex !== index))}
              >
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
          <li className="subtask-add">
            <Icon name="plus" size={14} />
            <input
              value={subtaskDraft}
              placeholder="Add a step and press Enter"
              aria-label="New subtask"
              onChange={(event) => setSubtaskDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addSubtask();
                }
              }}
            />
          </li>
        </ul>
      </div>

      <div className="field">
        <span className="label">Tags</span>
        <div className="tag-input">
          {values.tags.map((tag) => (
            <span key={tag} className="tag tag-removable">
              #{tag}
              <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => update('tags', values.tags.filter((other) => other !== tag))}>
                <Icon name="close" size={10} strokeWidth={2.6} />
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            placeholder={values.tags.length ? '' : 'exam, reading, group…'}
            aria-label="Add a tag"
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
                if (tagDraft.trim()) {
                  event.preventDefault();
                  addTag();
                } else if (event.key !== 'Enter') {
                  event.preventDefault();
                }
              } else if (event.key === 'Backspace' && !tagDraft && values.tags.length) {
                update('tags', values.tags.slice(0, -1));
              }
            }}
            onBlur={addTag}
          />
        </div>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="modal-foot">
        {onDelete ? (
          <button type="button" className="btn btn-ghost btn-danger-ghost" onClick={onDelete}>
            <Icon name="trash" size={15} />
            Delete
          </button>
        ) : null}
        <span className="spacer" />
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
