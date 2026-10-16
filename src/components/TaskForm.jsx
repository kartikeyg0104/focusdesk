import { useId, useState } from 'react';
import { formatDateInput } from '../utils/date.js';

const EMPTY = {
  title: '',
  description: '',
  subjectId: '',
  priority: 'medium',
  status: 'todo',
  dueDate: '',
  estimatedMinutes: '',
};

export function TaskForm({ task, subjects, submitLabel, onSubmit, onCancel, onDelete, compact = false }) {
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
        }
      : EMPTY
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (!values.title.trim()) {
      setError('Add a task title.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit({
        title: values.title,
        description: values.description,
        subjectId: values.subjectId || null,
        priority: values.priority,
        status: compact ? 'todo' : values.status,
        dueDate: values.dueDate ? new Date(`${values.dueDate}T12:00:00`).toISOString() : null,
        estimatedMinutes: values.estimatedMinutes === '' ? null : Number(values.estimatedMinutes),
      });
      if (compact) {
        setValues(EMPTY);
        setBusy(false);
      }
    } catch (submitError) {
      setError(submitError.message);
      setBusy(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor={`${formId}-title`}>Title</label>
        <input
          id={`${formId}-title`}
          value={values.title}
          onChange={(event) => update('title', event.target.value)}
          autoFocus={!compact}
          aria-invalid={Boolean(error)}
        />
      </div>
      {compact ? null : (
        <div className="field">
          <label htmlFor={`${formId}-description`}>Description</label>
          <textarea
            id={`${formId}-description`}
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </div>
      )}
      <div className="form-row">
        <div className="field">
          <label htmlFor={`${formId}-subject`}>Subject</label>
          <select
            id={`${formId}-subject`}
            value={values.subjectId}
            onChange={(event) => update('subjectId', event.target.value)}
          >
            <option value="">Unassigned</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${formId}-priority`}>Priority</label>
          <select
            id={`${formId}-priority`}
            value={values.priority}
            onChange={(event) => update('priority', event.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        {compact ? null : (
          <div className="field">
            <label htmlFor={`${formId}-status`}>Status</label>
            <select
              id={`${formId}-status`}
              value={values.status}
              onChange={(event) => update('status', event.target.value)}
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor={`${formId}-due`}>Due date</label>
          <input
            id={`${formId}-due`}
            type="date"
            value={values.dueDate}
            onChange={(event) => update('dueDate', event.target.value)}
          />
        </div>
      </div>
      {compact ? null : (
        <div className="field">
          <label htmlFor={`${formId}-estimate`}>Estimated minutes</label>
          <input
            id={`${formId}-estimate`}
            type="number"
            min="0"
            max="1440"
            value={values.estimatedMinutes}
            onChange={(event) => update('estimatedMinutes', event.target.value)}
          />
        </div>
      )}
      {error ? <p className="field-error">{error}</p> : null}
      <div className="row">
        <div>
          {onDelete ? (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Delete task
            </button>
          ) : null}
        </div>
        <div className="header-actions">
          {onCancel ? (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
