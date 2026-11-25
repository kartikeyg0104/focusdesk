import { useEffect, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { Kbd, Segmented, Switch } from '../components/ui.jsx';

export const ACCENTS = [
  { id: 'violet', label: 'Violet', color: '#8b7cff' },
  { id: 'blue', label: 'Blue', color: '#4f9dff' },
  { id: 'emerald', label: 'Emerald', color: '#2fcf9a' },
  { id: 'rose', label: 'Rose', color: '#ff6b9a' },
  { id: 'amber', label: 'Amber', color: '#f5a524' },
];

const START_PAGES = [
  ['dashboard', 'Dashboard'],
  ['tasks', 'Tasks'],
  ['calendar', 'Calendar'],
  ['focus', 'Focus'],
  ['notes', 'Notes'],
  ['statistics', 'Insights'],
];

function Stepper({ label, hint, value, min, max, step = 1, suffix = 'min', onChange }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  function commit(raw) {
    const number = Math.round(Number(raw));
    if (!Number.isFinite(number)) {
      setDraft(String(value));
      return;
    }
    const next = Math.min(max, Math.max(min, number));
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  return (
    <div className="setting-row">
      <span className="switch-copy">
        <span>{label}</span>
        {hint ? <span className="muted small">{hint}</span> : null}
      </span>
      <div className="stepper">
        <button type="button" onClick={() => commit(value - step)} disabled={value <= min} aria-label={`Decrease ${label}`}>
          −
        </button>
        <input
          inputMode="numeric"
          value={draft}
          aria-label={label}
          onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, ''))}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
        <span className="stepper-suffix">{suffix}</span>
        <button type="button" onClick={() => commit(value + step)} disabled={value >= max} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, description, children, index }) {
  return (
    <section className="card settings-section" style={{ '--i': index }}>
      <header>
        <span className="settings-icon">
          <Icon name={icon} size={17} />
        </span>
        <div>
          <h3>{title}</h3>
          {description ? <p className="muted small">{description}</p> : null}
        </div>
      </header>
      <div className="settings-body">{children}</div>
    </section>
  );
}

export function Settings({ settings, version, userDataPath, isMac, onUpdate, onResetPreferences, onExportJson, onExportCsv, onImport, onTestSound }) {
  const [name, setName] = useState(settings.studentName || '');
  const mod = isMac ? '⌘' : 'Ctrl';
  const save = (patch) => onUpdate(patch).catch(() => {});

  const shortcuts = [
    [`${mod} K`, 'Search and commands'],
    [`${mod} N`, 'New task'],
    [`${mod} 1 – 7`, 'Jump between pages'],
    [`${mod} ,`, 'Settings'],
    [`${mod} B`, 'Collapse the sidebar'],
    ['Space', 'Start, pause, or resume the timer'],
    ['Esc', 'Close a dialog or leave zen mode'],
  ];

  return (
    <div className="settings-grid">
      <Section index={0} icon="palette" title="Appearance" description="Theme, accent color, and motion.">
        <div className="setting-row">
          <span className="switch-copy">
            <span>Your name</span>
            <span className="muted small">Shown in the greeting.</span>
          </span>
          <input
            className="input-sm"
            value={name}
            placeholder="Optional"
            aria-label="Your name"
            onChange={(event) => setName(event.target.value)}
            onBlur={() => name !== settings.studentName && save({ studentName: name })}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
        </div>
        <div className="setting-row">
          <span className="switch-copy">
            <span>Theme</span>
          </span>
          <Segmented
            label="Theme"
            size="sm"
            value={settings.theme}
            onChange={(value) => save({ theme: value })}
            options={[
              { value: 'light', label: 'Light', icon: 'sun' },
              { value: 'dark', label: 'Dark', icon: 'moon' },
              { value: 'system', label: 'System' },
            ]}
          />
        </div>
        <div className="setting-row">
          <span className="switch-copy">
            <span>Accent color</span>
          </span>
          <div className="swatches" role="radiogroup" aria-label="Accent color">
            {ACCENTS.map((accent) => (
              <button
                key={accent.id}
                type="button"
                role="radio"
                aria-checked={settings.accent === accent.id}
                aria-label={accent.label}
                data-tip={accent.label}
                className={`swatch ${settings.accent === accent.id ? 'is-selected' : ''}`}
                style={{ '--c': accent.color }}
                onClick={() => save({ accent: accent.id })}
              />
            ))}
          </div>
        </div>
        <div className="setting-row">
          <span className="switch-copy">
            <span>Open on</span>
          </span>
          <select className="select-sm" value={settings.startPage} aria-label="Start page" onChange={(event) => save({ startPage: event.target.value })}>
            {START_PAGES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Switch label="Reduce motion" hint="Turns off animations and confetti." checked={settings.reduceMotion} onChange={(value) => save({ reduceMotion: value })} />
      </Section>

      <Section index={1} icon="focus" title="Timer" description="Block lengths and what happens when one ends.">
        <Stepper label="Focus" value={settings.focusMinutes} min={1} max={180} step={5} onChange={(value) => save({ focusMinutes: value })} />
        <Stepper label="Short break" value={settings.shortBreakMinutes} min={1} max={60} onChange={(value) => save({ shortBreakMinutes: value })} />
        <Stepper label="Long break" value={settings.longBreakMinutes} min={1} max={90} step={5} onChange={(value) => save({ longBreakMinutes: value })} />
        <Stepper label="Long break after" value={settings.longBreakInterval} min={2} max={12} suffix="sessions" onChange={(value) => save({ longBreakInterval: value })} />
        <Stepper label="Daily goal" hint="Drives the goal ring and your streak reminders." value={settings.dailyGoalMinutes} min={15} max={720} step={15} onChange={(value) => save({ dailyGoalMinutes: value })} />
        <Switch label="Start breaks automatically" checked={settings.autoStartBreaks} onChange={(value) => save({ autoStartBreaks: value })} />
        <Switch label="Start the next focus block automatically" checked={settings.autoStartFocus} onChange={(value) => save({ autoStartFocus: value })} />
      </Section>

      <Section index={2} icon="bell" title="Sound and notifications" description="Chimes inside the app, banners outside it.">
        <Switch
          label="Sound effects"
          hint="A chime when a block ends and a tick when you finish a task."
          checked={settings.soundEnabled}
          onChange={(value) => {
            save({ soundEnabled: value });
            if (value) onTestSound();
          }}
        />
        <Switch label="Desktop notifications" checked={settings.notificationsEnabled} onChange={(value) => save({ notificationsEnabled: value })} />
        <Switch label="Focus block finished" disabled={!settings.notificationsEnabled} checked={settings.notifyFocusComplete} onChange={(value) => save({ notifyFocusComplete: value })} />
        <Switch label="Break finished" disabled={!settings.notificationsEnabled} checked={settings.notifyBreakComplete} onChange={(value) => save({ notifyBreakComplete: value })} />
        <Switch label="Deadlines due and overdue" disabled={!settings.notificationsEnabled} checked={settings.notifyDeadlines} onChange={(value) => save({ notifyDeadlines: value })} />
        <Switch label="Daily goal reached" disabled={!settings.notificationsEnabled} checked={settings.notifyDailyGoal} onChange={(value) => save({ notifyDailyGoal: value })} />
      </Section>

      <Section index={3} icon="keyboard" title="Keyboard shortcuts" description="Everything is reachable without the mouse.">
        <ul className="shortcut-list">
          {shortcuts.map(([keys, action]) => (
            <li key={keys}>
              <span>{action}</span>
              <Kbd>{keys}</Kbd>
            </li>
          ))}
        </ul>
      </Section>

      <Section index={4} icon="database" title="Your data" description="Stored only on this computer. No account, no cloud.">
        <p className="path-box" title={userDataPath}>
          {userDataPath}
        </p>
        <div className="button-row">
          <button type="button" className="btn btn-glass" onClick={onExportJson}>
            <Icon name="download" size={15} />
            Export backup
          </button>
          <button type="button" className="btn btn-glass" onClick={() => onExportCsv('tasks')}>
            Tasks CSV
          </button>
          <button type="button" className="btn btn-glass" onClick={() => onExportCsv('sessions')}>
            Sessions CSV
          </button>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn-ghost" onClick={onImport}>
            <Icon name="upload" size={15} />
            Restore from backup
          </button>
          <button type="button" className="btn btn-ghost" onClick={onResetPreferences}>
            <Icon name="reset" size={15} />
            Reset preferences
          </button>
        </div>
        <p className="muted small">Restoring replaces everything, after FocusDesk saves a copy of your current data. FocusDesk {version}.</p>
      </Section>
    </div>
  );
}
