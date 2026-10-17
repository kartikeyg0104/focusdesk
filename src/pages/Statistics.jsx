import { useMemo, useState } from 'react';
import { StatisticsCard } from '../components/StatisticsCard.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { formatDuration, phaseLabel } from '../utils/formatTime.js';
import { formatDate, startOfDay, endOfDay, inLocalRange } from '../utils/date.js';

export function Statistics({ stats, sessions, tasks, subjects }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subjectId, setSubjectId] = useState('all');
  const maxSeconds = Math.max(1, ...stats.daily.map((day) => day.seconds));
  const maxSubject = Math.max(1, ...stats.subjects.map((item) => item.seconds));

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      if (subjectId !== 'all' && (session.subjectId || 'unassigned') !== subjectId) return false;
      if (from && to) {
        return inLocalRange(session.endedAt, startOfDay(from), endOfDay(to));
      }
      return true;
    });
  }, [from, sessions, subjectId, to]);

  const filteredSeconds = filtered
    .filter((session) => session.phase === 'focus')
    .reduce((total, session) => total + (session.durationSeconds || 0), 0);

  return (
    <div className="page-stack">
      <section className="grid-metrics">
        <StatisticsCard label="Today" value={formatDuration(stats.studySecondsToday)} hint="Local midnight to now" />
        <StatisticsCard label="This week" value={formatDuration(stats.studySecondsWeek)} hint="Monday to Sunday" />
        <StatisticsCard label="This month" value={formatDuration(stats.studySecondsMonth)} hint="Calendar month" />
        <StatisticsCard
          label="Focus sessions"
          value={stats.completedFocusAll}
          hint={`Average ${formatDuration(stats.averageFocusSeconds)}`}
        />
      </section>

      <section className="grid-metrics">
        <StatisticsCard label="Tasks completed" value={stats.tasks.completed} />
        <StatisticsCard label="Tasks remaining" value={stats.tasks.remaining} />
        <StatisticsCard label="Overdue" value={stats.tasks.overdue} />
        <StatisticsCard label="Completed today" value={stats.tasks.completedToday} />
      </section>

      <section className="split">
        <article className="panel">
          <div className="panel-title">
            <h2>Daily study time</h2>
          </div>
          <div className="week-chart" aria-label="Daily study time">
            {stats.daily.map((day) => (
              <div key={day.date} className="week-col">
                <div className="week-bar-track">
                  <div className="week-bar" style={{ height: day.seconds ? `${Math.max(6, (day.seconds / maxSeconds) * 100)}%` : '0%' }} />
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-title">
            <h2>Time by subject</h2>
          </div>
          {stats.subjects.every((item) => item.seconds === 0) ? (
            <EmptyState title="No subject time yet" body="Complete a focus session to see the split." />
          ) : (
            stats.subjects.map((item) => (
              <div key={item.id} className="dist-row">
                <span>{item.name}</span>
                <div className="dist-track">
                  <div
                    className="dist-fill"
                    style={{ width: `${(item.seconds / maxSubject) * 100}%`, background: item.color }}
                  />
                </div>
                <span className="muted">{formatDuration(item.seconds)}</span>
              </div>
            ))
          )}
        </article>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Session history</h2>
        </div>
        <div className="toolbar">
          <div className="field-inline">
            <label htmlFor="from-date">From</label>
            <input id="from-date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="field-inline">
            <label htmlFor="to-date">To</label>
            <input id="to-date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div className="field-inline">
            <label htmlFor="session-subject">Subject</label>
            <select id="session-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>
          Filtered focus time: {formatDuration(filteredSeconds)}
        </p>
        {filtered.length === 0 ? (
          <EmptyState title="No sessions in this range" body="Adjust the dates or subject filter." />
        ) : (
          <div className="session-list" style={{ marginTop: 16 }}>
            {filtered.slice(0, 20).map((session) => (
              <article key={session.id} className="task-card">
                <div className="row">
                  <strong>
                    {phaseLabel(session.phase)} · {formatDuration(session.durationSeconds)}
                  </strong>
                  <span className="chip">{session.completed ? 'Completed' : 'Interrupted'}</span>
                </div>
                <p className="muted">
                  {formatDate(session.endedAt)}
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
