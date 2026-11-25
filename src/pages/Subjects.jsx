import { useMemo, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { Modal } from '../components/Modal.jsx';
import { formatDuration } from '../utils/formatTime.js';

const COLORS = ['#8B7CFF', '#6EA8FE', '#38BDF8', '#42D6B5', '#A3E635', '#F5C46A', '#FB923C', '#FF6B7A', '#F472B6', '#C084FC'];

function SubjectForm({ subject, onSubmit, onCancel }) {
  const [name, setName] = useState(subject?.name || '');
  const [description, setDescription] = useState(subject?.description || '');
  const [color, setColor] = useState(subject?.color || COLORS[0]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError('Give the subject a name.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit({ name, description, color });
    } catch (submitError) {
      setError(submitError.message);
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="subject-name">Name</label>
        <input id="subject-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Organic Chemistry" data-autofocus />
      </div>
      <div className="field">
        <label htmlFor="subject-description">Description</label>
        <input id="subject-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" />
      </div>
      <div className="field">
        <span className="label" id="subject-color-label">
          Color
        </span>
        <div className="swatches" role="radiogroup" aria-labelledby="subject-color-label">
          {COLORS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={color.toLowerCase() === value.toLowerCase()}
              aria-label={value}
              className={`swatch ${color.toLowerCase() === value.toLowerCase() ? 'is-selected' : ''}`}
              style={{ '--c': value }}
              onClick={() => setColor(value)}
            />
          ))}
          <label className="swatch swatch-custom" style={{ '--c': color }} title="Custom color">
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Custom color" />
          </label>
        </div>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      <div className="modal-foot">
        <span className="spacer" />
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {subject ? 'Save subject' : 'Add subject'}
        </button>
      </div>
    </form>
  );
}

export function Subjects({ subjects, tasks, sessions, onCreate, onUpdate, onDelete, onShowTasks }) {
  const [editing, setEditing] = useState(null); // null | 'new' | subject

  const metrics = useMemo(() => {
    const map = new Map(subjects.map((subject) => [subject.id, { open: 0, done: 0, seconds: 0 }]));
    tasks.forEach((task) => {
      const entry = map.get(task.subjectId);
      if (!entry) return;
      if (task.status === 'completed') entry.done += 1;
      else entry.open += 1;
    });
    sessions.forEach((session) => {
      const entry = map.get(session.subjectId);
      if (entry && session.phase === 'focus') entry.seconds += session.durationSeconds || 0;
    });
    return map;
  }, [sessions, subjects, tasks]);

  return (
    <div className="subject-grid">
      {subjects.map((subject, index) => {
        const metric = metrics.get(subject.id);
        const total = metric.open + metric.done;
        const percent = total ? Math.round((metric.done / total) * 100) : 0;
        return (
          <article key={subject.id} className="card subject-card spot" style={{ '--c': subject.color, '--i': index }}>
            <header>
              <span className="subject-badge">{subject.name.slice(0, 1).toUpperCase()}</span>
              <div className="row-actions is-visible">
                <button type="button" className="icon-btn" onClick={() => setEditing(subject)} aria-label={`Edit ${subject.name}`}>
                  <Icon name="edit" size={14} />
                </button>
                <button type="button" className="icon-btn icon-btn-danger" onClick={() => onDelete(subject)} aria-label={`Delete ${subject.name}`}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </header>
            <h3>{subject.name}</h3>
            <p className="muted small">{subject.description || 'No description'}</p>
            <div className="subject-stats">
              <div>
                <strong>{metric.open}</strong>
                <span>open</span>
              </div>
              <div>
                <strong>{metric.done}</strong>
                <span>done</span>
              </div>
              <div>
                <strong>{formatDuration(metric.seconds)}</strong>
                <span>focused</span>
              </div>
            </div>
            <div className="progress" aria-label={`${percent}% of tasks complete`}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <button type="button" className="btn btn-ghost btn-sm subject-link" onClick={() => onShowTasks(subject)}>
              View tasks
              <Icon name="arrowRight" size={14} />
            </button>
          </article>
        );
      })}

      <button type="button" className="card subject-card subject-new" style={{ '--i': subjects.length }} onClick={() => setEditing('new')}>
        <span className="subject-new-icon">
          <Icon name="plus" size={22} />
        </span>
        <strong>New subject</strong>
        <span className="muted small">Add a course or a project</span>
      </button>

      {editing ? (
        <Modal title={editing === 'new' ? 'New subject' : 'Edit subject'} onClose={() => setEditing(null)} size="sm">
          <SubjectForm
            subject={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (payload) => {
              if (editing === 'new') await onCreate(payload);
              else await onUpdate(editing.id, payload);
              setEditing(null);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
