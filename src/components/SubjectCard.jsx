export function SubjectCard({ subject, taskCount, completedCount, studyLabel, onEdit, onDelete }) {
  return (
    <article className="subject-card">
      <div className="row">
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <span className="swatch" style={{ background: subject.color }} />
          <strong>{subject.name}</strong>
        </div>
      </div>
      <p className="muted">{subject.description || 'No description yet.'}</p>
      <div className="task-meta">
        {taskCount} open · {completedCount} completed · {studyLabel}
      </div>
      <div className="header-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onEdit(subject)}>
          Edit
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => onDelete(subject)}>
          Delete
        </button>
      </div>
    </article>
  );
}
