import { useMemo, useState } from 'react';
import { Icon } from './Icons.jsx';
import { SubjectDot } from './ui.jsx';
import { parseQuickAdd } from '../utils/quickAdd.js';

const HINT_ICON = { priority: 'flag', tag: 'tag', estimate: 'clock', date: 'calendar' };

export function QuickAdd({ subjects, onCreate, placeholder = 'Add a task…  try “Lab report fri !high #chem 45m”' }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const parsed = useMemo(() => parseQuickAdd(value, { subjects }), [subjects, value]);

  async function submit(event) {
    event.preventDefault();
    if (busy || !parsed.title) return;
    setBusy(true);
    setError('');
    try {
      const { hints: _hints, ...fields } = parsed;
      await onCreate(fields);
      setValue('');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`quick-add ${value ? 'has-value' : ''}`} onSubmit={submit}>
      <div className="quick-add-field">
        <span className="quick-add-icon">
          <Icon name="plus" size={16} strokeWidth={2.4} />
        </span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-label="Quick add a task"
          spellCheck="false"
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !parsed.title}>
          Add
        </button>
      </div>
      {parsed.hints.length > 0 || error ? (
        <div className="quick-add-hints">
          {parsed.hints.map((hint, index) => (
            <span key={`${hint.kind}-${index}`} className={`hint hint-${hint.kind}`}>
              {hint.kind === 'subject' ? <SubjectDot color={hint.color} /> : <Icon name={HINT_ICON[hint.kind]} size={11} />}
              {hint.label}
            </span>
          ))}
          {error ? <span className="field-error">{error}</span> : null}
        </div>
      ) : null}
    </form>
  );
}
