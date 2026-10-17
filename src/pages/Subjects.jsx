import { useState } from 'react';
import { SubjectCard } from '../components/SubjectCard.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { formatDuration } from '../utils/formatTime.js';

const COLORS = ['#8B7CFF', '#42D6B5', '#F5C46A', '#6EA8FE', '#FF6B7A', '#C084FC'];

export function Subjects({ subjects, tasks, sessions, onCreate, onUpdate, onDelete }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  function counts(subjectId) {
    const related = tasks.filter((task) => task.subjectId === subjectId);
    return {
      open: related.filter((task) => task.status !== 'completed').length,
      completed: related.filter((task) => task.status === 'completed').length,
      seconds: sessions
        .filter((session) => session.subjectId === subjectId && session.phase === 'focus')
        .reduce((total, session) => total + (session.durationSeconds || 0), 0),
    };
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await onUpdate(editing.id, { name, description, color });
        setEditing(null);
      } else {
        await onCreate({ name, description, color });
      }
      setName('');
      setDescription('');
      setColor(COLORS[0]);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-title">
          <h2>{editing ? 'Edit subject' : 'New subject'}</h2>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="subject-name">Name</label>
              <input id="subject-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="field">
              <span id="subject-color-label">Color</span>
              <div className="color-swatches" role="radiogroup" aria-labelledby="subject-color-label">
                {COLORS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`color-choice ${color === value ? 'is-selected' : ''}`}
                    style={{ background: value }}
                    aria-label={value}
                    aria-checked={color === value}
                    role="radio"
                    onClick={() => setColor(value)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="subject-description">Description</label>
            <input
              id="subject-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {error ? <p className="field-error">{error}</p> : null}
          <div className="header-actions">
            {editing ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(null);
                  setName('');
                  setDescription('');
                }}
              >
                Cancel
              </button>
            ) : null}
            <button type="submit" className="btn btn-primary">
              {editing ? 'Save subject' : 'Add subject'}
            </button>
          </div>
        </form>
      </section>

      {subjects.length === 0 ? (
        <EmptyState title="No subjects yet" body="Add the courses you are taking this term." />
      ) : (
        <div className="subject-grid">
          {subjects.map((subject) => {
            const metric = counts(subject.id);
            return (
              <SubjectCard
                key={subject.id}
                subject={subject}
                taskCount={metric.open}
                completedCount={metric.completed}
                studyLabel={formatDuration(metric.seconds)}
                onEdit={(item) => {
                  setEditing(item);
                  setName(item.name);
                  setDescription(item.description || '');
                  setColor(item.color);
                }}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
