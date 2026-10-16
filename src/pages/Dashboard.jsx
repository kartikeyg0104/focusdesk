import { TaskCard } from '../components/TaskCard.jsx';
import { TaskForm } from '../components/TaskForm.jsx';
import { StatisticsCard } from '../components/StatisticsCard.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { formatDuration, phaseLabel } from '../utils/formatTime.js';
import { formatDate, greetingFor, isBeforeDay, isSameDay } from '../utils/date.js';

export function Dashboard({
  settings,
  tasks,
  subjects,
  stats,
  timer,
  onOpenTask,
  onComplete,
  onReopen,
  onFocus,
  onNavigate,
  onCreateTask,
}) {
  const now = new Date();
  const dueToday = tasks.filter((task) => task.status !== 'completed' && task.dueDate && isSameDay(task.dueDate, now));
  const overdue = tasks.filter((task) => task.status !== 'completed' && task.dueDate && isBeforeDay(task.dueDate, now));
  const greeting = `${greetingFor(now)}${settings.studentName ? `, ${settings.studentName}` : ''}`;
  const maxSeconds = Math.max(1, ...stats.daily.map((day) => day.seconds));
  const subjectById = Object.fromEntries(subjects.map((subject) => [subject.id, subject]));

  return (
    <div className="page-stack">
      <section className="grid-metrics">
        <StatisticsCard
          label="Due today"
          value={dueToday.length}
          hint="Open assignments with today's deadline"
          onClick={() => onNavigate('tasks')}
        />
        <StatisticsCard
          label="Overdue"
          value={overdue.length}
          hint="Needs attention first"
          onClick={() => onNavigate('tasks')}
        />
        <StatisticsCard
          label="Completed today"
          value={stats.tasks.completedToday}
          hint="Finished since midnight"
          onClick={() => onNavigate('tasks')}
        />
        <StatisticsCard
          label="Study time today"
          value={formatDuration(stats.studySecondsToday)}
          hint={timer.state.status === 'idle' ? 'No session running' : `${phaseLabel(timer.state.phase)} in progress`}
          onClick={() => onNavigate('focus')}
        />
      </section>

      <section className="split">
        <article className="panel">
          <div className="panel-title">
            <div>
              <h2>{greeting}</h2>
              <p className="muted">Weekly focus time: {formatDuration(stats.studySecondsWeek)}</p>
            </div>
          </div>
          <div className="week-chart" aria-label="Weekly study time">
            {stats.daily.map((day) => (
              <div key={day.date} className="week-col">
                <div className="week-bar-track">
                  <div
                    className="week-bar"
                    style={{ height: day.seconds ? `${Math.max(6, (day.seconds / maxSeconds) * 100)}%` : '0%' }}
                    title={`${day.label}: ${formatDuration(day.seconds)}`}
                  />
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-title">
            <h2>Quick add</h2>
          </div>
          <TaskForm compact subjects={subjects} submitLabel="Add task" onSubmit={onCreateTask} />
        </article>
      </section>

      <section className="split">
        <article className="panel">
          <div className="panel-title">
            <h2>Today's priorities</h2>
          </div>
          {overdue.concat(dueToday).length === 0 ? (
            <EmptyState title="Nothing due right now" body="When a deadline lands today, it will show up here." />
          ) : (
            <div className="task-list">
              {overdue.concat(dueToday).slice(0, 6).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  subject={subjectById[task.subjectId]}
                  onOpen={onOpenTask}
                  onComplete={onComplete}
                  onReopen={onReopen}
                  onFocus={onFocus}
                />
              ))}
            </div>
          )}
        </article>
        <article className="panel">
          <div className="panel-title">
            <h2>Upcoming deadlines</h2>
          </div>
          {stats.upcoming.length === 0 ? (
            <EmptyState title="No upcoming dates" body="Add due dates to tasks to fill this list." />
          ) : (
            <div className="task-list">
              {stats.upcoming.map((task) => (
                <button key={task.id} type="button" className="clickable-card" onClick={() => onOpenTask(task)}>
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">{formatDate(task.dueDate)}</div>
                </button>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
