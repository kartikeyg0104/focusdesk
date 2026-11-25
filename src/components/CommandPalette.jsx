import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal.jsx';
import { Icon } from './Icons.jsx';
import { Kbd } from './ui.jsx';
import { NAV_LINKS } from './Sidebar.jsx';

function matches(text, needle) {
  if (!needle) return true;
  const haystack = text.toLowerCase();
  // Every typed word has to appear somewhere, in any order.
  return needle.split(/\s+/).every((part) => haystack.includes(part));
}

export function CommandPalette({ tasks, notes, actions, isMac, onClose, onNavigate, onOpenTask, onOpenNote }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const mod = isMac ? '⌘' : 'Ctrl';

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const actionItems = actions
      .filter((action) => matches(`${action.label} ${action.keywords || ''}`, needle))
      .map((action) => ({ ...action, kind: 'action', key: `action-${action.id}` }));
    const pageItems = NAV_LINKS.map((link, position) => ({ link, position }))
      .filter(({ link }) => matches(`go to ${link.label} ${link.id}`, needle))
      .map(({ link, position }) => ({
      key: `page-${link.id}`,
      kind: 'page',
      id: link.id,
      icon: link.icon,
      label: `Go to ${link.label}`,
      shortcut: position < 7 ? `${mod} ${position + 1}` : null,
    }));
    const taskItems = tasks
      .filter((task) => matches(`${task.title} ${(task.tags || []).join(' ')} ${task.description || ''}`, needle))
      .sort((left, right) => (left.status === 'completed') - (right.status === 'completed'))
      .slice(0, needle ? 8 : 4)
      .map((task) => ({
        key: `task-${task.id}`,
        kind: 'task',
        task,
        icon: task.status === 'completed' ? 'check' : 'tasks',
        label: task.title,
        hint: task.status === 'completed' ? 'Done' : null,
      }));
    const noteItems = notes
      .filter((note) => matches(`${note.title} ${note.body || ''}`, needle))
      .slice(0, needle ? 6 : 2)
      .map((note) => ({ key: `note-${note.id}`, kind: 'note', note, icon: 'notes', label: note.title }));
    return [
      { title: 'Actions', items: actionItems },
      { title: 'Navigate', items: pageItems },
      { title: 'Tasks', items: taskItems },
      { title: 'Notes', items: noteItems },
    ].filter((group) => group.items.length > 0);
  }, [actions, mod, notes, query, tasks]);

  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const active = Math.min(index, Math.max(0, flat.length - 1));

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function run(item) {
    if (!item) return;
    onClose();
    if (item.kind === 'page') onNavigate(item.id);
    if (item.kind === 'task') onOpenTask(item.task);
    if (item.kind === 'note') onOpenNote(item.note);
    if (item.kind === 'action') item.run();
  }

  let cursor = -1;
  return (
    <Modal title="Command palette" onClose={onClose} size="palette" bare>
      <div className="palette-search">
        <Icon name="search" size={18} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIndex(Math.min(flat.length - 1, active + 1));
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setIndex(Math.max(0, active - 1));
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              run(flat[active]);
            }
          }}
          placeholder="Search tasks, notes, and commands…"
          aria-label="Search tasks, notes, and commands"
          spellCheck="false"
          data-autofocus
        />
        <Kbd>Esc</Kbd>
      </div>
      <div className="palette-list" role="listbox" aria-label="Results" ref={listRef}>
        {flat.length === 0 ? <p className="palette-empty">Nothing matches “{query}”.</p> : null}
        {groups.map((group) => (
          <div key={group.title} className="palette-group">
            <div className="palette-heading">{group.title}</div>
            {group.items.map((item) => {
              cursor += 1;
              const position = cursor;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={position === active}
                  className="palette-item"
                  onMouseMove={() => position !== active && setIndex(position)}
                  onClick={() => run(item)}
                >
                  <span className="palette-icon">
                    <Icon name={item.icon} size={15} />
                  </span>
                  <span className="palette-label">{item.label}</span>
                  {item.hint ? <span className="muted small">{item.hint}</span> : null}
                  {item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="palette-foot">
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to move
        </span>
        <span>
          <Kbd>↵</Kbd> to run
        </span>
      </div>
    </Modal>
  );
}
