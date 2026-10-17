import { useEffect, useState } from 'react';

const SHORTCUTS = [
  { keys: '⌘/Ctrl N', action: 'Create a new task' },
  { keys: '⌘/Ctrl K', action: 'Open quick search' },
  { keys: '⌘/Ctrl ,', action: 'Open Settings' },
  { keys: 'Space', action: 'Pause or resume the timer when you are not typing' },
  { keys: 'Esc', action: 'Close the active dialog' },
];

export function Settings({
  settings,
  version,
  userDataPath,
  onUpdate,
  onResetPreferences,
  onExportJson,
  onExportCsv,
  onImport,
}) {
  const [name, setName] = useState(settings.studentName || '');
  const [busy, setBusy] = useState('');

  async function save(patch) {
    setBusy('save');
    try {
      await onUpdate(patch);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-title">
          <h2>Appearance and start page</h2>
        </div>
        <div className="settings-grid">
          <div className="field">
            <label htmlFor="student-name">What should FocusDesk call you?</label>
            <input
              id="student-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => save({ studentName: name })}
            />
          </div>
          <div className="field">
            <label htmlFor="theme">Theme</label>
            <select
              id="theme"
              value={settings.theme}
              onChange={(event) => save({ theme: event.target.value })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="start-page">Start page</label>
            <select
              id="start-page"
              value={settings.startPage}
              onChange={(event) => save({ startPage: event.target.value })}
            >
              <option value="dashboard">Dashboard</option>
              <option value="tasks">Tasks</option>
              <option value="focus">Focus Timer</option>
              <option value="statistics">Statistics</option>
            </select>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Timer lengths</h2>
        </div>
        <div className="settings-grid">
          <NumberField
            id="focus-minutes"
            label="Focus minutes"
            value={settings.focusMinutes}
            onChange={(value) => save({ focusMinutes: value })}
          />
          <NumberField
            id="short-break"
            label="Short break minutes"
            value={settings.shortBreakMinutes}
            onChange={(value) => save({ shortBreakMinutes: value })}
          />
          <NumberField
            id="long-break"
            label="Long break minutes"
            value={settings.longBreakMinutes}
            onChange={(value) => save({ longBreakMinutes: value })}
          />
          <NumberField
            id="long-interval"
            label="Focus sessions before a long break"
            value={settings.longBreakInterval}
            onChange={(value) => save({ longBreakInterval: value })}
          />
          <NumberField
            id="daily-goal"
            label="Daily study goal, minutes"
            value={settings.dailyGoalMinutes}
            onChange={(value) => save({ dailyGoalMinutes: value })}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Desktop notifications</h2>
        </div>
        <Toggle
          label="Enable notifications"
          checked={settings.notificationsEnabled}
          onChange={(value) => save({ notificationsEnabled: value })}
        />
        <Toggle
          label="Focus session completed"
          checked={settings.notifyFocusComplete}
          onChange={(value) => save({ notifyFocusComplete: value })}
        />
        <Toggle
          label="Break completed"
          checked={settings.notifyBreakComplete}
          onChange={(value) => save({ notifyBreakComplete: value })}
        />
        <Toggle
          label="Upcoming and overdue deadlines"
          checked={settings.notifyDeadlines}
          onChange={(value) => save({ notifyDeadlines: value })}
        />
        <Toggle
          label="Daily study goal reached"
          checked={settings.notifyDailyGoal}
          onChange={(value) => save({ notifyDailyGoal: value })}
        />
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Keyboard shortcuts</h2>
        </div>
        <table className="shortcut-table">
          <thead>
            <tr>
              <th>Shortcut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((item) => (
              <tr key={item.keys}>
                <td>
                  <kbd>{item.keys}</kbd>
                </td>
                <td>{item.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Data and backup</h2>
        </div>
        <p className="muted">
          Local data is stored in the application user-data folder, not in the project directory.
        </p>
        <p className="path-box">{userDataPath}</p>
        <p className="muted stack-gap">
          Export writes a copy you choose. Restore replaces current tasks, subjects, sessions, and settings after FocusDesk writes a pre-restore backup next to that folder. If the selected file is invalid, current data is left unchanged.
        </p>
        <div className="header-actions stack-gap wrap">
          <button type="button" className="btn btn-primary" onClick={onExportJson} disabled={Boolean(busy)}>
            Export JSON backup
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onExportCsv('tasks')}>
            Export tasks CSV
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onExportCsv('sessions')}>
            Export sessions CSV
          </button>
        </div>
        <div className="header-actions stack-gap wrap">
          <button type="button" className="btn btn-ghost" onClick={onImport}>
            Restore from backup
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Preferences reset</h2>
        </div>
        <p className="muted">
          This restores theme, timer lengths, and notification defaults. Tasks, subjects, and session history stay in place.
        </p>
        <div className="header-actions stack-gap">
          <button type="button" className="btn btn-ghost" onClick={onResetPreferences}>
            Reset preferences
          </button>
        </div>
        <p className="muted stack-gap">
          FocusDesk {version}. All data stays on this computer.
        </p>
      </section>
    </div>
  );
}

function NumberField({ id, label, value, onChange }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min="1"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = Number(draft);
          if (!Number.isFinite(next) || next < 1) {
            setDraft(value);
            return;
          }
          onChange(next);
        }}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="toggle-row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}
