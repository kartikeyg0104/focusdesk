import { useState } from 'react';
import { Icon } from './Icons.jsx';
import { TaskMeta } from './TaskRow.jsx';

const COLUMNS = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Done' },
];

// Kanban view. Cards move between columns with native drag and drop; the
// arrow buttons do the same thing for keyboard users.
export function TaskBoard({ tasks, subjectById, focusByTask, onOpen, onMove, onNew }) {
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);

  return (
    <div className="board">
      {COLUMNS.map((column, columnIndex) => {
        const items = tasks.filter((task) => task.status === column.id);
        return (
          <section
            key={column.id}
            className={`board-col col-${column.id} ${over === column.id ? 'is-over' : ''}`}
            style={{ '--i': columnIndex }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              if (over !== column.id) setOver(column.id);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOver(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData('text/plain') || dragging;
              const task = tasks.find((item) => item.id === id);
              setOver(null);
              setDragging(null);
              if (task && task.status !== column.id) onMove(task, column.id);
            }}
          >
            <header className="board-head">
              <span className="board-dot" />
              <h3>{column.label}</h3>
              <span className="count">{items.length}</span>
              {column.id === 'todo' ? (
                <button type="button" className="icon-btn" onClick={onNew} aria-label="New task">
                  <Icon name="plus" size={14} />
                </button>
              ) : null}
            </header>
            <div className="board-list">
              {items.map((task, index) => (
                <article
                  key={task.id}
                  className={`board-card priority-${task.priority} ${dragging === task.id ? 'is-dragging' : ''}`}
                  style={{ '--i': Math.min(index, 10) }}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', task.id);
                    event.dataTransfer.effectAllowed = 'move';
                    setDragging(task.id);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                >
                  <button type="button" className="board-card-body" onClick={() => onOpen(task)}>
                    <span className="task-title-text">{task.title}</span>
                    <TaskMeta task={task} subject={subjectById[task.subjectId]} focusSeconds={focusByTask.get(task.id) || 0} />
                  </button>
                  <div className="board-move">
                    {columnIndex > 0 ? (
                      <button type="button" className="icon-btn" onClick={() => onMove(task, COLUMNS[columnIndex - 1].id)} aria-label={`Move ${task.title} to ${COLUMNS[columnIndex - 1].label}`}>
                        <Icon name="chevronLeft" size={13} />
                      </button>
                    ) : null}
                    {columnIndex < COLUMNS.length - 1 ? (
                      <button type="button" className="icon-btn" onClick={() => onMove(task, COLUMNS[columnIndex + 1].id)} aria-label={`Move ${task.title} to ${COLUMNS[columnIndex + 1].label}`}>
                        <Icon name="chevronRight" size={13} />
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
              {items.length === 0 ? <p className="board-empty">Drop a task here</p> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
