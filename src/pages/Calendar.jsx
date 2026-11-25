import { useMemo, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { EmptyState } from '../components/ui.jsx';
import { TaskRow } from '../components/TaskRow.jsx';
import { formatDateInput, startOfWeek } from '../utils/date.js';
import { formatDuration } from '../utils/formatTime.js';
import { focusByDay } from '../utils/insights.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Calendar({ tasks, subjects, sessions, focusByTask, actions }) {
  const todayKey = formatDateInput(new Date());
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(todayKey);
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const focusTotals = useMemo(() => focusByDay(sessions), [sessions]);

  const tasksByDay = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = formatDateInput(task.dueDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    });
    return map;
  }, [tasks]);

  // Six full weeks starting on the Monday on or before the 1st.
  const days = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date, key: formatDateInput(date), inMonth: date.getMonth() === cursor.getMonth() };
    });
  }, [cursor]);

  const selectedTasks = tasksByDay.get(selected) || [];
  const selectedDate = new Date(`${selected}T12:00:00`);
  const selectedFocus = focusTotals.get(selected) || 0;

  function shiftMonth(amount) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  return (
    <div className="calendar-layout">
      <section className="card calendar">
        <header className="calendar-head">
          <h2 key={cursor.getTime()}>{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <span className="spacer" />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const now = new Date();
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelected(todayKey);
            }}
          >
            Today
          </button>
          <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <Icon name="chevronLeft" size={16} />
          </button>
          <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
            <Icon name="chevronRight" size={16} />
          </button>
        </header>
        <div className="calendar-weekdays">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid" key={cursor.getTime()}>
          {days.map((day, index) => {
            const dayTasks = tasksByDay.get(day.key) || [];
            const focus = focusTotals.get(day.key) || 0;
            return (
              <button
                key={day.key}
                type="button"
                className={`day ${day.inMonth ? '' : 'is-outside'} ${day.key === todayKey ? 'is-today' : ''} ${day.key === selected ? 'is-selected' : ''}`}
                style={{ '--i': index }}
                onClick={() => setSelected(day.key)}
                onDoubleClick={() => actions.newTask({ dueDate: day.key })}
                aria-label={`${day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}, ${dayTasks.length} tasks`}
                aria-pressed={day.key === selected}
              >
                <span className="day-top">
                  <span className="day-number">{day.date.getDate()}</span>
                  {focus > 0 ? <span className="day-focus" title={`${formatDuration(focus)} focused`}>{formatDuration(focus)}</span> : null}
                </span>
                <span className="day-tasks">
                  {dayTasks.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={`day-task ${task.status === 'completed' ? 'is-done' : ''}`}
                      style={{ '--c': subjectById[task.subjectId]?.color || 'var(--text-faint)' }}
                    >
                      {task.title}
                    </span>
                  ))}
                  {dayTasks.length > 3 ? <span className="day-more">+{dayTasks.length - 3} more</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="card panel day-panel" key={selected}>
        <header className="panel-head">
          <div>
            <h3>{selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}</h3>
            <p className="muted small">
              {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
              {selectedFocus ? ` · ${formatDuration(selectedFocus)} focused` : ''}
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.newTask({ dueDate: selected })}>
            <Icon name="plus" size={14} />
            Add
          </button>
        </header>
        {selectedTasks.length === 0 ? (
          <EmptyState icon="calendar" title="Nothing due" body="Double-click any day to add a task for it." />
        ) : (
          <div className="task-list">
            {selectedTasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                index={index}
                subject={subjectById[task.subjectId]}
                focusSeconds={focusByTask.get(task.id) || 0}
                onOpen={actions.openTask}
                onToggle={actions.toggleTask}
                onFocus={actions.focusTask}
              />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
