import { useMemo, useState } from 'react';
import { Modal } from './Modal.jsx';

const PAGES = [
  { id: 'dashboard', label: 'Go to Dashboard' },
  { id: 'tasks', label: 'Go to Tasks' },
  { id: 'subjects', label: 'Go to Subjects' },
  { id: 'focus', label: 'Go to Focus Timer' },
  { id: 'statistics', label: 'Go to Statistics' },
  { id: 'settings', label: 'Go to Settings' },
];

export function CommandPalette({ tasks, onClose, onNavigate, onOpenTask, onNewTask }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pageItems = PAGES.filter((item) => item.label.toLowerCase().includes(needle)).map((item) => ({
      ...item,
      kind: 'page',
    }));
    const taskItems = tasks
      .filter((task) => task.title.toLowerCase().includes(needle))
      .slice(0, 8)
      .map((task) => ({ id: task.id, label: task.title, kind: 'task', task }));
    const extras = [{ id: 'new-task', label: 'Create a new task', kind: 'action' }];
    return [...extras, ...pageItems, ...taskItems];
  }, [query, tasks]);

  function run(item) {
    if (!item) return;
    if (item.kind === 'page') onNavigate(item.id);
    if (item.kind === 'task') onOpenTask(item.task);
    if (item.kind === 'action') onNewTask();
    onClose();
  }

  return (
    <Modal title="Quick search" onClose={onClose} labelledBy="command-title">
      <label htmlFor="command-input" className="sr-only">
        Search pages and tasks
      </label>
      <input
        id="command-input"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIndex((current) => Math.min(items.length - 1, current + 1));
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setIndex((current) => Math.max(0, current - 1));
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            run(items[index]);
          }
        }}
        placeholder="Jump to a page or task"
        autoFocus
      />
      <div className="command-list" role="listbox" aria-label="Search results">
        {items.map((item, itemIndex) => (
          <button
            key={`${item.kind}-${item.id}`}
            type="button"
            className="command-item"
            role="option"
            aria-selected={itemIndex === index}
            onClick={() => run(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
