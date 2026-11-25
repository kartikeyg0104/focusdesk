import { useMemo, useState } from 'react';
import { AnimatedNumber, EmptyState, Segmented, StatCard, SubjectDot } from '../components/ui.jsx';
import { BarChart, Donut, Heatmap, HourChart } from '../components/charts.jsx';
import { Icon } from '../components/Icons.jsx';
import { formatDuration, phaseLabel } from '../utils/formatTime.js';
import { formatDate, startOfDay, endOfDay, inLocalRange } from '../utils/date.js';
import { dailySeries, formatHour, heatmapWeeks, hourlyDistribution, peakHour } from '../utils/insights.js';

export function Statistics({ stats, sessions, tasks, subjects, settings, streak }) {
  const [range, setRange] = useState(7);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subjectId, setSubjectId] = useState('all');

  const series = useMemo(() => dailySeries(sessions, range), [range, sessions]);
  const weeks = useMemo(() => heatmapWeeks(sessions, 20), [sessions]);
  const hours = useMemo(() => hourlyDistribution(sessions), [sessions]);
  const peak = useMemo(() => peakHour(sessions), [sessions]);
  const rangeTotal = series.reduce((sum, day) => sum + day.seconds, 0);
  const activeDays = series.filter((day) => day.seconds > 0).length;
  const segments = stats.subjects.filter((item) => item.seconds > 0).map((item) => ({ id: item.id, label: item.name, value: item.seconds, color: item.color }));
  const totalFocus = segments.reduce((sum, segment) => sum + segment.value, 0);
  const completionRate = stats.tasks.total ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) : 0;

  const filtered = useMemo(
    () =>
      sessions.filter((session) => {
        if (subjectId !== 'all' && (session.subjectId || 'unassigned') !== subjectId) return false;
        if (from && !inLocalRange(session.endedAt, startOfDay(`${from}T12:00:00`), new Date(8640000000000000))) return false;
        if (to && !inLocalRange(session.endedAt, new Date(0), endOfDay(`${to}T12:00:00`))) return false;
        return true;
      }),
    [from, sessions, subjectId, to]
  );
  const filteredSeconds = filtered.filter((session) => session.phase === 'focus').reduce((total, session) => total + (session.durationSeconds || 0), 0);

  return (
    <div className="page-stack">
      <section className="stat-grid">
        <StatCard index={0} icon="clock" label="Today" value={formatDuration(stats.studySecondsToday)} hint={`Goal ${formatDuration(settings.dailyGoalMinutes * 60)}`} />
        <StatCard index={1} icon="statistics" label="This week" value={formatDuration(stats.studySecondsWeek)} hint={`${stats.completedFocusWeek} sessions`} />
        <StatCard
          index={2}
          icon="flame"
          tone="warning"
          label="Current streak"
          value={
            <>
              <AnimatedNumber value={streak.current} /> <small>day{streak.current === 1 ? '' : 's'}</small>
            </>
          }
          hint={`Best ${streak.best} · ${streak.activeDays} active days`}
        />
        <StatCard
          index={3}
          icon="check"
          tone="success"
          label="Tasks completed"
          value={
            <>
              <AnimatedNumber value={completionRate} />
              <small>%</small>
            </>
          }
          hint={`${stats.tasks.completed} of ${stats.tasks.total}`}
        />
      </section>

      <section className="insight-grid">
        <article className="card panel span-2">
          <header className="panel-head">
            <div>
              <h3>Focus time</h3>
              <p className="muted small">
                {formatDuration(rangeTotal)} over {activeDays} active day{activeDays === 1 ? '' : 's'}
                {activeDays ? ` · ${formatDuration(rangeTotal / activeDays)} per active day` : ''}
              </p>
            </div>
            <Segmented
              label="Range"
              size="sm"
              value={range}
              onChange={setRange}
              options={[
                { value: 7, label: '7 days' },
                { value: 30, label: '30 days' },
              ]}
            />
          </header>
          <BarChart key={range} data={series} goalSeconds={settings.dailyGoalMinutes * 60} height={210} dense={range > 10} />
        </article>

        <article className="card panel">
          <header className="panel-head">
            <h3>By subject</h3>
          </header>
          {segments.length === 0 ? (
            <EmptyState icon="subjects" title="No focus time yet" body="Run a focus block on a task to see the split." />
          ) : (
            <div className="donut-wrap">
              <Donut segments={segments} centerValue={formatDuration(totalFocus)} centerLabel="total" />
              <ul className="legend">
                {segments.slice(0, 6).map((segment) => (
                  <li key={segment.id}>
                    <SubjectDot color={segment.color} />
                    <span>{segment.label}</span>
                    <strong>{Math.round((segment.value / totalFocus) * 100)}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article className="card panel span-2">
          <header className="panel-head">
            <div>
              <h3>Consistency</h3>
              <p className="muted small">Last 20 weeks</p>
            </div>
          </header>
          <Heatmap weeks={weeks} />
        </article>

        <article className="card panel">
          <header className="panel-head">
            <div>
              <h3>Time of day</h3>
              <p className="muted small">{peak === null ? 'When you focus best' : `You focus most around ${formatHour(peak)}`}</p>
            </div>
          </header>
          <HourChart hours={hours} />
          <div className="mini-stats">
            <div>
              <strong>{stats.completedFocusAll}</strong>
              <span>sessions</span>
            </div>
            <div>
              <strong>{formatDuration(stats.averageFocusSeconds)}</strong>
              <span>average</span>
            </div>
            <div>
              <strong>{formatDuration(stats.studySecondsMonth)}</strong>
              <span>this month</span>
            </div>
          </div>
        </article>
      </section>

      <section className="card panel">
        <header className="panel-head">
          <div>
            <h3>Session history</h3>
            <p className="muted small">
              {filtered.length} session{filtered.length === 1 ? '' : 's'} · {formatDuration(filteredSeconds)} focused
            </p>
          </div>
          <div className="toolbar-inline">
            <input type="date" className="select-sm" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
            <span className="muted small">to</span>
            <input type="date" className="select-sm" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
            <select className="select-sm" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} aria-label="Subject">
              <option value="all">All subjects</option>
              <option value="unassigned">No subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </header>
        {filtered.length === 0 ? (
          <EmptyState icon="clock" title="No sessions here" body={sessions.length ? 'Try a wider date range or a different subject.' : 'Your focus history will build up as you use the timer.'} />
        ) : (
          <ul className="session-list is-table">
            {filtered.slice(0, 25).map((session) => (
              <li key={session.id} className={`session phase-${session.phase}`}>
                <span className="session-icon">
                  <Icon name={session.phase === 'focus' ? 'zap' : 'coffee'} size={13} />
                </span>
                <span className="session-copy">
                  <span>{tasks.find((task) => task.id === session.taskId)?.title || (session.phase === 'focus' ? 'Free focus' : phaseLabel(session.phase))}</span>
                  <span className="muted small">
                    {phaseLabel(session.phase)} · {formatDate(session.endedAt)}
                  </span>
                </span>
                {!session.completed ? <span className="pill">Stopped early</span> : null}
                <strong className="session-duration">{formatDuration(session.durationSeconds)}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
