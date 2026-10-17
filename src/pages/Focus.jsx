import { PomodoroTimer } from '../components/PomodoroTimer.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { formatDuration, phaseLabel } from '../utils/formatTime.js';
import { formatDate } from '../utils/date.js';

export function Focus({ tasks, subjects, sessions, timer, onSelectTask }) {
  const openTasks = tasks.filter((task) => task.status !== 'completed');
  const currentTask = tasks.find((task) => task.id === timer.state.taskId);
  const recent = sessions.slice(0, 8);
  const subjectById = Object.fromEntries(subjects.map((subject) => [subject.id, subject]));

  return (
    <div className="page-stack">
      <div className="split">
        <PomodoroTimer
          phase={timer.state.phase}
          status={timer.state.status}
          remaining={timer.remaining}
          duration={timer.duration}
          task={currentTask}
          completedFocusCount={timer.state.completedFocusCount}
          onStart={() => timer.start()}
          onPause={timer.pause}
          onResume={timer.resume}
          onReset={timer.reset}
          onSkip={timer.skip}
        />
        <section className="panel">
          <div className="panel-title">
            <h2>Link a task</h2>
          </div>
          {openTasks.length === 0 ? (
            <EmptyState title="No open tasks" body="Create an assignment first, then start a session against it." />
          ) : (
            <div className="task-list">
              {openTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={`clickable-card ${timer.state.taskId === task.id ? 'is-selected' : ''}`}
                  onClick={() => onSelectTask(task)}
                  aria-pressed={timer.state.taskId === task.id}
                >
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">{subjectById[task.subjectId]?.name || 'Unassigned'}</div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-title">
          <h2>Recent sessions</h2>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No sessions yet" body="Completed and interrupted focus blocks will appear here." />
        ) : (
          <div className="session-list">
            {recent.map((session) => (
              <article key={session.id} className="task-card">
                <div className="row">
                  <strong>{phaseLabel(session.phase)}</strong>
                  <span className="chip">{session.completed ? 'Completed' : 'Interrupted'}</span>
                </div>
                <p className="muted">
                  {formatDuration(session.durationSeconds)} · {formatDate(session.endedAt)}
                  {session.taskId ? ` · ${tasks.find((task) => task.id === session.taskId)?.title || 'Removed task'}` : ''}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
