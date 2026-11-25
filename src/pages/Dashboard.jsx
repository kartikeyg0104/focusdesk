import { useMemo } from 'react';
import { Icon } from '../components/Icons.jsx';
import { AnimatedNumber, EmptyState, StatCard, SubjectDot } from '../components/ui.jsx';
import { BarChart } from '../components/charts.jsx';
import { QuickAdd } from '../components/QuickAdd.jsx';
import { TaskRow } from '../components/TaskRow.jsx';
import { dueInfo, formatDuration, phaseLabel } from '../utils/formatTime.js';
import { isBeforeDay, isSameDay } from '../utils/date.js';
import { dailySeries } from '../utils/insights.js';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

export function Dashboard({ tasks, subjects, sessions, settings, stats, streak, focusByTask, timer, actions }) {
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const week = useMemo(() => dailySeries(sessions, 7), [sessions]);

  const { today, upcoming, nextUp } = useMemo(() => {
    const now = new Date();
    const open = tasks.filter((task) => task.status !== 'completed');
    const urgent = open
      .filter((task) => task.dueDate && (isBeforeDay(task.dueDate, now) || isSameDay(task.dueDate, now)))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    const inProgress = open.filter((task) => task.status === 'in_progress' && !urgent.includes(task));
    const todayList = [...urgent, ...inProgress];
    const later = open
      .filter((task) => task.dueDate && !todayList.includes(task))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
    // Suggest what to work on: something already due, else the most important open task.
    const suggestion =
      todayList[0] ||
      [...open].sort(
        (a, b) =>
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity)
      )[0] ||
      null;
    return { today: todayList, upcoming: later, nextUp: suggestion };
  }, [tasks]);

  const goalSeconds = settings.dailyGoalMinutes * 60;
  const goalProgress = Math.min(1, stats.studySecondsToday / goalSeconds);
  const timerActive = timer.state.status !== 'idle';
  const activeTask = timerActive ? tasks.find((task) => task.id === timer.state.taskId) : null;
  const heroTask = activeTask || nextUp;
  const heroDue = heroTask ? dueInfo(heroTask) : null;

  return (
    <div className="page-stack">
      <section className="hero card spot">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow">
            <Icon name={timerActive ? 'zap' : 'sparkle'} size={13} />
            {timerActive ? `${phaseLabel(timer.state.phase)} in progress` : heroTask ? 'Up next' : 'All clear'}
          </span>
          <h2>{heroTask ? heroTask.title : 'Nothing is waiting on you.'}</h2>
          <p className="hero-meta">
            {heroTask ? (
              <>
                {subjectById[heroTask.subjectId] ? (
                  <span className="meta-item">
                    <SubjectDot color={subjectById[heroTask.subjectId].color} />
                    {subjectById[heroTask.subjectId].name}
                  </span>
                ) : null}
                {heroDue ? <span className={`meta-item tone-${heroDue.tone}`}>Due {heroDue.label.toLowerCase()}</span> : null}
                {heroTask.estimatedMinutes ? <span className="meta-item">{formatDuration(heroTask.estimatedMinutes * 60)} estimated</span> : null}
              </>
            ) : (
              'Add a task below, or start a free focus block.'
            )}
          </p>
          <div className="hero-actions">
            {timerActive ? (
              <button type="button" className="btn btn-primary btn-lg" onClick={() => actions.navigate('focus')}>
                <Icon name="focus" size={17} />
                Open timer
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => (heroTask ? actions.focusTask(heroTask) : actions.startFocus())}
              >
                <Icon name="play" size={15} />
                {heroTask ? 'Start focus' : 'Start a focus block'}
              </button>
            )}
            {heroTask ? (
              <button type="button" className="btn btn-glass btn-lg" onClick={() => actions.openTask(heroTask)}>
                Open task
              </button>
            ) : null}
          </div>
        </div>
        <div className="hero-goal">
          <div className="goal-ring">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="ring-track" cx="60" cy="60" r="52" strokeWidth="9" fill="none" />
              <circle
                className="ring-value"
                cx="60"
                cy="60"
                r="52"
                strokeWidth="9"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - goalProgress)}
              />
            </svg>
            <div className="ring-center">
              <strong>
                <AnimatedNumber value={Math.round(goalProgress * 100)} />%
              </strong>
              <span>of daily goal</span>
            </div>
          </div>
          <p>
            {formatDuration(stats.studySecondsToday)} of {formatDuration(goalSeconds)}
          </p>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard
          index={0}
          icon="clock"
          label="Focus today"
          value={formatDuration(stats.studySecondsToday)}
          hint={`${stats.completedFocusToday} session${stats.completedFocusToday === 1 ? '' : 's'} completed`}
          onClick={() => actions.navigate('statistics')}
        />
        <StatCard
          index={1}
          icon="flame"
          tone="warning"
          label="Streak"
          value={
            <>
              <AnimatedNumber value={streak.current} /> <small>day{streak.current === 1 ? '' : 's'}</small>
            </>
          }
          hint={streak.studiedToday ? 'Kept alive today' : streak.current > 0 ? 'Study today to keep it' : `Best: ${streak.best} days`}
          onClick={() => actions.navigate('statistics')}
        />
        <StatCard
          index={2}
          icon="alert"
          tone={stats.tasks.overdue > 0 ? 'danger' : 'success'}
          label="Due today"
          value={<AnimatedNumber value={stats.tasks.dueToday} />}
          hint={stats.tasks.overdue > 0 ? `${stats.tasks.overdue} overdue` : 'Nothing overdue'}
          onClick={() => actions.navigate('tasks')}
        />
        <StatCard
          index={3}
          icon="check"
          tone="success"
          label="Done today"
          value={<AnimatedNumber value={stats.tasks.completedToday} />}
          hint={`${stats.tasks.remaining} still open`}
          onClick={() => actions.navigate('tasks')}
        />
      </section>

      <QuickAdd subjects={subjects} onCreate={actions.createTask} />

      <section className="dash-grid">
        <article className="card panel">
          <header className="panel-head">
            <div>
              <h3>Today</h3>
              <p className="muted small">Overdue, due today, and in progress</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => actions.navigate('tasks')}>
              All tasks
              <Icon name="arrowRight" size={14} />
            </button>
          </header>
          {today.length === 0 ? (
            <EmptyState icon="trophy" title="You're caught up" body="Nothing is due today. Get ahead, or take the win." />
          ) : (
            <div className="task-list">
              {today.slice(0, 7).map((task, index) => (
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
        </article>

        <div className="dash-side">
          <article className="card panel">
            <header className="panel-head">
              <div>
                <h3>Last 7 days</h3>
                <p className="muted small">{formatDuration(week.reduce((sum, day) => sum + day.seconds, 0))} focused</p>
              </div>
            </header>
            <BarChart data={week} goalSeconds={goalSeconds} height={150} />
          </article>

          <article className="card panel">
            <header className="panel-head">
              <h3>Coming up</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => actions.navigate('calendar')}>
                Calendar
              </button>
            </header>
            {upcoming.length === 0 ? (
              <p className="muted small pad-b">No upcoming deadlines. Give tasks a due date to see them here.</p>
            ) : (
              <ul className="upcoming-list">
                {upcoming.map((task) => {
                  const due = new Date(task.dueDate);
                  return (
                    <li key={task.id}>
                      <button type="button" onClick={() => actions.openTask(task)}>
                        <span className="date-chip">
                          <span>{due.toLocaleDateString(undefined, { month: 'short' })}</span>
                          <strong>{due.getDate()}</strong>
                        </span>
                        <span className="upcoming-copy">
                          <span className="task-title-text">{task.title}</span>
                          <span className="muted small">
                            {subjectById[task.subjectId]?.name || 'No subject'} · {dueInfo(task).label}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
