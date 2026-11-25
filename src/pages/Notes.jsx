import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { EmptyState, SubjectDot } from '../components/ui.jsx';
import { relativeTime } from '../utils/formatTime.js';

// The editor keeps its own draft and saves it shortly after the user stops
// typing, so there is no Save button and no per-keystroke disk write.
function Editor({ note, subjects, onSave, onDelete }) {
  const [draft, setDraft] = useState({ title: note.title, body: note.body || '' });
  const [status, setStatus] = useState('saved');
  const pending = useRef(null);
  const latest = useRef(draft);
  latest.current = draft;

  useEffect(() => {
    return () => {
      // Leaving the note (or the page) with unsaved edits flushes them first.
      if (pending.current) {
        window.clearTimeout(pending.current);
        onSave(note.id, latest.current).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function change(patch) {
    const next = { ...latest.current, ...patch };
    setDraft(next);
    setStatus('saving');
    window.clearTimeout(pending.current);
    pending.current = window.setTimeout(async () => {
      pending.current = null;
      try {
        await onSave(note.id, next);
        setStatus('saved');
      } catch (_error) {
        setStatus('error');
      }
    }, 500);
  }

  const words = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0;

  return (
    <section className="card note-editor">
      <header className="note-toolbar">
        <select
          className="select-sm"
          aria-label="Subject"
          value={note.subjectId || ''}
          onChange={(event) => onSave(note.id, { subjectId: event.target.value || null })}
        >
          <option value="">No subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <span className={`save-state is-${status}`}>
          {status === 'saving' ? 'Saving…' : status === 'error' ? 'Could not save' : 'Saved'}
        </span>
        <span className="spacer" />
        <button
          type="button"
          className={`icon-btn ${note.pinned ? 'is-on' : ''}`}
          onClick={() => onSave(note.id, { pinned: !note.pinned })}
          aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          aria-pressed={note.pinned}
          data-tip={note.pinned ? 'Unpin' : 'Pin to top'}
        >
          <Icon name="pin" size={15} />
        </button>
        <button type="button" className="icon-btn icon-btn-danger" onClick={() => onDelete(note)} aria-label="Delete note" data-tip="Delete">
          <Icon name="trash" size={15} />
        </button>
      </header>
      <input
        className="note-title"
        value={draft.title}
        onChange={(event) => change({ title: event.target.value })}
        placeholder="Untitled note"
        aria-label="Note title"
      />
      <textarea
        className="note-body"
        value={draft.body}
        onChange={(event) => change({ body: event.target.value })}
        placeholder="Start writing…"
        aria-label="Note text"
      />
      <footer className="note-foot">
        {words} word{words === 1 ? '' : 's'} · edited {relativeTime(note.updatedAt)}
      </footer>
    </section>
  );
}

export function Notes({ notes, subjects, selectedId, onSelect, onCreate, onSave, onDelete }) {
  const [query, setQuery] = useState('');
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((subject) => [subject.id, subject])), [subjects]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notes
      .filter((note) => !needle || `${note.title} ${note.body || ''}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [notes, query]);

  const selected = notes.find((note) => note.id === selectedId) || visible[0] || null;

  return (
    <div className="notes-layout">
      <aside className="card note-list">
        <div className="note-list-head">
          <div className="search-field">
            <Icon name="search" size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" aria-label="Search notes" />
          </div>
          <button type="button" className="btn btn-primary btn-icon" onClick={() => onCreate()} aria-label="New note" data-tip="New note">
            <Icon name="plus" size={16} strokeWidth={2.4} />
          </button>
        </div>
        <div className="note-items">
          {visible.length === 0 ? (
            <p className="muted small pad">{notes.length === 0 ? 'No notes yet.' : 'No notes match.'}</p>
          ) : (
            visible.map((note, index) => (
              <button
                key={note.id}
                type="button"
                className={`note-item ${selected?.id === note.id ? 'is-active' : ''}`}
                style={{ '--i': Math.min(index, 12) }}
                onClick={() => onSelect(note.id)}
              >
                <span className="note-item-title">
                  {note.pinned ? <Icon name="pin" size={12} /> : null}
                  <span>{note.title || 'Untitled note'}</span>
                </span>
                <span className="note-item-preview">{(note.body || '').trim().slice(0, 90) || 'No text yet'}</span>
                <span className="note-item-meta">
                  {subjectById[note.subjectId] ? (
                    <>
                      <SubjectDot color={subjectById[note.subjectId].color} />
                      {subjectById[note.subjectId].name} ·{' '}
                    </>
                  ) : null}
                  {relativeTime(note.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {selected ? (
        <Editor key={selected.id} note={selected} subjects={subjects} onSave={onSave} onDelete={onDelete} />
      ) : (
        <section className="card note-editor is-empty">
          <EmptyState
            icon="notes"
            title="Keep your notes next to your work"
            body="Lecture notes, formulas, reading lists. Everything saves automatically as you type."
            action={
              <button type="button" className="btn btn-primary" onClick={() => onCreate()}>
                <Icon name="plus" size={16} />
                New note
              </button>
            }
          />
        </section>
      )}
    </div>
  );
}
