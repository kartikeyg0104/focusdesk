import { useEffect, useMemo } from 'react';
import { Icon } from '../components/Icons.jsx';
import { EmptyState, Segmented, SubjectDot } from '../components/ui.jsx';
import { TimerRing } from '../components/TimerRing.jsx';
import { formatDuration, phaseLabel, relativeTime } from '../utils/formatTime.js';
import { isSameDay } from '../utils/date.js';

const PRESETS = [
  { label: 'Classic', focus: 25, short: 5, long: 15 },
  { label: 'Deep work', focus: 50, short: 10, long: 20 },
  { label: 'Marathon', focus: 90, short: 15, long: 30 },
];

const AMBIENT = [
  { value: 'off', label: 'Off' },
  { value: 'rain', label: 'Rain' },
  { value: 'brown', label: 'Brown' },
  { value: 'white', label: 'White' },
];

export function Focus({ tasks, subjects, sessions, settings, timer, zen, onZenChange, onUpdateSettings, actions }) {
  const { state } = timer;
  const idle = state.status === 'idle';
  const running = state.status === 'running';
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const currentTask = tasks.find((task) => task.id === state.taskId) || null;
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'completed'), [tasks]);
  const todaySessions = useMemo(() => sessions.filter((session) => isSameDay(session.endedAt, new Date())), [sessions]);
  const interval = settings.longBreakInterval;
  const filled = state.completedFocusCount % interval;
  const activePreset = PRESETS.find(
    (preset) => preset.focus === settings.focusMinutes && preset.short === settings.shortBreakMinutes && preset.long === settings.longBreakMinutes
  );

  useEffect(() => {
    if (!zen) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') onZenChange(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onZenChange, zen]);

  const caption = currentTask ? currentTask.title : idle ? 'Press space to start' : 'Free focus';

  const timerCard = (
    <section className={`card timer-card phase-${state.phase} ${running ? 'is-running' : ''}`}>
      <div className="timer-card-top">
        <Segmented
          label="Timer phase"
          value={state.phase}
          onChange={timer.selectPhase}
          options={[
            { value: 'focus', label: 'Focus', disabled: !idle },
            { value: 'shortBreak', label: 'Short break', disabled: !idle },
            { value: 'longBreak', label: 'Long break', disabled: !idle },
          ]}
        />
        <button
          type="button"
          className="icon-btn icon-btn-lg"
          onClick={() => onZenChange(!zen)}
          aria-label={zen ? 'Leave zen mode' : 'Enter zen mode'}
          data-tip={zen ? 'Leave zen mode (Esc)' : 'Zen mode'}
        >
          <Icon name={zen ? 'shrink' : 'expand'} size={16} />
        </button>
      </div>

      <TimerRing timer={timer} size={zen ? 400 : 320} caption={caption} />

      <div className="session-dots" aria-label={`${filled} of ${interval} focus sessions before a long break`}>
        {Array.from({ length: interval }, (_, index) => (
          <span key={index} className={index < filled ? 'is-filled' : ''} />
        ))}
        <span className="session-dots-label">
          {filled}/{interval} until a long break
        </span>
      </div>

      <div className="timer-controls">
        <button type="button" className="control" onClick={timer.reset} disabled={idle} aria-label="Reset" data-tip="Reset">
          <Icon name="reset" size={18} />
        </button>
        <button type="button" className="control control-main" onClick={timer.toggle} aria-label={running ? 'Pause' : idle ? 'Start' : 'Resume'}>
          <Icon name={running ? 'pause' : 'play'} size={26} />
        </button>
        <button type="button" className="control" onClick={timer.skip} disabled={idle} aria-label="Skip" data-tip="Skip to next">
          <Icon name="skip" size={18} />
        </button>
      </div>

      <div className="timer-extras">
        {!idle ? (
          <button type="button" className="chip-btn" onClick={() => timer.addMinutes(5)}>
            <Icon name="plus" size={12} />5 min
          </button>
        ) : (
          PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`chip-btn ${activePreset === preset ? 'is-active' : ''}`}
              onClick={() =>
                onUpdateSettings({ focusMinutes: preset.focus, shortBreakMinutes: preset.short, longBreakMinutes: preset.long })
              }
            >
              {preset.label} · {preset.focus}/{preset.short}
            </button>
          ))
        )}
      </div>
    </section>
  );

  if (zen) {
    return (
      <div className={`zen phase-${state.phase}`}>
        <div className="zen-aurora" aria-hidden="true" />
        {timerCard}
      </div>
    );
  }

  return (
    <div className="focus-layout">
      {timerCard}

      <div className="focus-side">
        <section className="card panel">
          <header className="panel-head">
            <h3>Working on</h3>
            {currentTask ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => timer.setTask(null)}>
                Clear
              </button>
            ) : null}
          </header>
          {currentTask ? (
            <div className="current-task">
              <button type="button" className="current-task-title" onClick={() => actions.openTask(currentTask)}>
                <SubjectDot color={subjectById[currentTask.subjectId]?.color} size={10} />
                <span>{currentTask.title}</span>
              </button>
              {(currentTask.subtasks || []).length > 0 ? (
                <ul className="subtask-list is-readonly">
                  {currentTask.subtasks.map((item) => (
                    <li key={item.id} className={item.done ? 'is-done' : ''}>
                      <button
                        type="button"
                        className={`check check-sm ${item.done ? 'is-checked' : ''}`}
                        aria-pressed={item.done}
                        aria-label={item.title}
                        onClick={() => actions.toggleSubtask(currentTask, item.id)}
                      >
                        <Icon name="check" size={11} strokeWidth={3} />
                      </button>
                      <span>{item.title}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button type="button" className="btn btn-glass btn-sm" onClick={() => actions.toggleTask(currentTask)}>
                <Icon name="check" size={14} />
                Mark complete
              </button>
            </div>
          ) : openTasks.length === 0 ? (
            <p className="muted small pad-b">No open tasks. You can still run a free focus block.</p>
          ) : (
            <div className="pick-list">
              {openTasks.slice(0, 30).map((task) => (
                <button key={task.id} type="button" className="pick-item" onClick={() => timer.setTask(task)}>
                  <SubjectDot color={subjectById[task.subjectId]?.color} />
                  <span>{task.title}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card panel">
          <header className="panel-head">
            <h3>
              <Icon name="volume" size={15} /> Ambient sound
            </h3>
          </header>
          <Segmented
            label="Ambient sound"
            value={settings.ambientSound}
            onChange={(value) => onUpdateSettings({ ambientSound: value })}
            options={AMBIENT}
          />
          <label className="slider-row">
            <span className="muted small">Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.ambientVolume}
              disabled={settings.ambientSound === 'off'}
              onChange={(event) => onUpdateSettings({ ambientVolume: Number(event.target.value) })}
              style={{ '--fill': `${settings.ambientVolume}%` }}
            />
          </label>
          <p className="muted small">Plays while a focus block is running.</p>
        </section>

        <section className="card panel">
          <header className="panel-head">
            <h3>Today's sessions</h3>
            <span className="muted small">
              {formatDuration(todaySessions.filter((session) => session.phase === 'focus').reduce((sum, session) => sum + session.durationSeconds, 0))}
            </span>
          </header>
          {todaySessions.length === 0 ? (
            <EmptyState icon="focus" title="No sessions yet today" body="Finished and interrupted blocks show up here." />
          ) : (
            <ul className="session-list">
              {todaySessions.slice(0, 8).map((session) => (
                <li key={session.id} className={`session phase-${session.phase}`}>
                  <span className="session-icon">
                    <Icon name={session.phase === 'focus' ? 'zap' : 'coffee'} size={13} />
                  </span>
                  <span className="session-copy">
                    <span>
                      {phaseLabel(session.phase)} · {formatDuration(session.durationSeconds)}
                    </span>
                    <span className="muted small">
                      {tasks.find((task) => task.id === session.taskId)?.title || (session.phase === 'focus' ? 'Free focus' : 'Break')} ·{' '}
                      {relativeTime(session.endedAt)}
                    </span>
                  </span>
                  {!session.completed ? <span className="pill">Stopped early</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
