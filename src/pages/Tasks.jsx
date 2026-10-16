import { TaskCard } from '../components/TaskCard.jsx';
import { EmptyState } from '../components/EmptyState.jsx';

export function Tasks({ tasks, subjects, filters, onFilterChange, onOpen, onComplete, onReopen, onFocus, onNew }) {
  const subjectById = Object.fromEntries(subjects.map((subject) => [subject.id, subject]));

  function update(field, value) {
    onFilterChange((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="toolbar">
          <div className="field-inline" style={{ flex: 1, minWidth: 220 }}>
            <label htmlFor="task-search">Search</label>
            <input
              id="task-search"
              value={filters.query}
              onChange={(event) => update('query', event.target.value)}
              placeholder="Search titles and notes"
            />
          </div>
          <div className="field-inline">
            <label htmlFor="filter-status">Status</label>
            <select id="filter-status" value={filters.status} onChange={(event) => update('status', event.target.value)}>
              <option value="all">All</option>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="field-inline">
            <label htmlFor="filter-priority">Priority</label>
            <select id="filter-priority" value={filters.priority} onChange={(event) => update('priority', event.target.value)}>
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="field-inline">
            <label htmlFor="filter-subject">Subject</label>
            <select id="filter-subject" value={filters.subjectId} onChange={(event) => update('subjectId', event.target.value)}>
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-inline">
            <label htmlFor="filter-due">Due</label>
            <select id="filter-due" value={filters.due} onChange={(event) => update('due', event.target.value)}>
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Upcoming</option>
              <option value="none">No date</option>
            </select>
          </div>
          <div className="field-inline">
            <label htmlFor="filter-sort">Sort</label>
            <select id="filter-sort" value={filters.sortBy} onChange={(event) => update('sortBy', event.target.value)}>
              <option value="dueDate">Deadline</option>
              <option value="priority">Priority</option>
              <option value="createdAt">Created</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>
      </section>

      {tasks.length === 0 ? (
        <EmptyState
          title="No matching tasks"
          body="Try a different filter, or add the next assignment you need to finish."
          action={
            <button type="button" className="btn btn-primary" onClick={onNew}>
              New task
            </button>
          }
        />
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              subject={subjectById[task.subjectId]}
              onOpen={onOpen}
              onComplete={onComplete}
              onReopen={onReopen}
              onFocus={onFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
