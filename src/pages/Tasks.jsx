import { useMemo } from 'react';
import { Icon } from '../components/Icons.jsx';
import { EmptyState, Segmented } from '../components/ui.jsx';
import { QuickAdd } from '../components/QuickAdd.jsx';
import { TaskRow } from '../components/TaskRow.jsx';
import { TaskBoard } from '../components/TaskBoard.jsx';
import { queryTasks } from '../utils/taskFilters.js';
import { dueInfo } from '../utils/formatTime.js';

const TABS = [
  { id: 'open', label: 'Open' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'done', label: 'Done' },
];

function inTab(task, tab) {
  const done = task.status === 'completed';
  if (tab === 'done') return done;
  if (done) return false;
  if (tab === 'open') return true;
  const days = dueInfo(task)?.days;
  if (days === undefined) return false;
  if (tab === 'today') return days === 0;
  if (tab === 'upcoming') return days > 0;
  if (tab === 'overdue') return days < 0;
  return true;
}

function bucketOf(task) {
  if (task.status === 'completed') return 'Completed';
  const days = dueInfo(task)?.days;
  if (days === undefined) return 'No date';
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return 'This week';
  return 'Later';
}

export function Tasks({ tasks, subjects, filters, onFilterChange, view, onViewChange, focusByTask, actions }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const tab = filters.tab || 'open';

  function update(field, value) {
    onFilterChange((current) => ({ ...current, [field]: value }));
  }

  // Search, subject, and priority apply everywhere; the tab only applies to the list.
  const narrowed = useMemo(
    () => queryTasks(tasks, { query: filters.query, priority: filters.priority, subjectId: filters.subjectId, sortBy: filters.sortBy }),
    [filters.priority, filters.query, filters.sortBy, filters.subjectId, tasks]
  );
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((item) => [item.id, narrowed.filter((task) => inTab(task, item.id)).length])),
    [narrowed]
  );
  const listed = useMemo(() => narrowed.filter((task) => inTab(task, tab)), [narrowed, tab]);

  const groups = useMemo(() => {
    if (filters.sortBy !== 'dueDate' || tab === 'done') return [{ title: null, items: listed }];
    const order = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later', 'No date', 'Completed'];
    const map = new Map();
    listed.forEach((task) => {
      const bucket = bucketOf(task);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket).push(task);
    });
    return order.filter((title) => map.has(title)).map((title) => ({ title, items: map.get(title) }));
  }, [filters.sortBy, listed, tab]);

  const filtering = Boolean(filters.query) || filters.priority !== 'all' || filters.subjectId !== 'all';
  let rowIndex = 0;

  return (
    <div className="page-stack">
      <QuickAdd subjects={subjects} onCreate={actions.createTask} />

      <section className="toolbar">
        {view === 'list' ? (
          <div className="tabs" role="tablist" aria-label="Task filter">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`tab ${tab === item.id ? 'is-active' : ''} ${item.id === 'overdue' && counts.overdue > 0 ? 'is-alert' : ''}`}
                onClick={() => update('tab', item.id)}
              >
                {item.label}
                <span className="count">{counts[item.id]}</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="muted small">Drag cards between columns to change their status.</span>
        )}
        <div className="toolbar-filters">
        <label className={`search-field is-compact ${filters.query ? 'has-value' : ''}`} data-tip={filters.query ? undefined : 'Filter tasks'}>
          <Icon name="search" size={15} />
          <input
            value={filters.query}
            onChange={(event) => update('query', event.target.value)}
            placeholder="Filter tasks"
            aria-label="Filter tasks"
          />
          {filters.query ? (
            <button type="button" className="icon-btn" onClick={() => update('query', '')} aria-label="Clear filter">
              <Icon name="close" size={12} />
            </button>
          ) : null}
        </label>
        <select className="select-sm" aria-label="Subject" value={filters.subjectId} onChange={(event) => update('subjectId', event.target.value)}>
          <option value="all">All subjects</option>
          <option value="unassigned">No subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <select className="select-sm" aria-label="Priority" value={filters.priority} onChange={(event) => update('priority', event.target.value)}>
          <option value="all">Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="select-sm" aria-label="Sort by" title="Sort by" value={filters.sortBy} onChange={(event) => update('sortBy', event.target.value)}>
          <option value="dueDate">Deadline</option>
          <option value="priority">Priority</option>
          <option value="createdAt">Newest</option>
          <option value="title">A to Z</option>
        </select>
        <Segmented
          label="View"
          size="sm"
          value={view}
          onChange={onViewChange}
          options={[
            { value: 'list', icon: 'list', title: 'List view' },
            { value: 'board', icon: 'board', title: 'Board view' },
          ]}
        />
        </div>
      </section>

      {view === 'board' ? (
        <TaskBoard
          tasks={narrowed}
          subjectById={subjectById}
          focusByTask={focusByTask}
          onOpen={actions.openTask}
          onMove={actions.moveTask}
          onNew={() => actions.newTask()}
        />
      ) : listed.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={tab === 'done' ? 'trophy' : 'inbox'}
            title={filtering ? 'No tasks match those filters' : tab === 'open' ? 'No open tasks' : `Nothing in ${TABS.find((item) => item.id === tab).label.toLowerCase()}`}
            body={filtering ? 'Try clearing the search or the subject and priority filters.' : 'Type in the bar above to add one. It understands dates, #tags, and !priority.'}
            action={
              <button type="button" className="btn btn-primary" onClick={() => actions.newTask()}>
                <Icon name="plus" size={16} />
                New task
              </button>
            }
          />
        </div>
      ) : (
        <div className="task-groups" key={`${tab}-${filters.sortBy}`}>
          {groups.map((group) => (
            <section key={group.title || 'all'} className="task-group">
              {group.title ? (
                <h3 className={`group-title ${group.title === 'Overdue' ? 'tone-danger' : ''}`}>
                  {group.title}
                  <span className="count">{group.items.length}</span>
                </h3>
              ) : null}
              <div className="task-list card">
                {group.items.map((task) => {
                  rowIndex += 1;
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      index={rowIndex}
                      subject={subjectById[task.subjectId]}
                      focusSeconds={focusByTask.get(task.id) || 0}
                      onOpen={actions.openTask}
                      onToggle={actions.toggleTask}
                      onFocus={actions.focusTask}
                      onDelete={actions.deleteTask}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
