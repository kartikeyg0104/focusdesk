import { formatDateInput, startOfDay, startOfWeek } from './date.js';

function focusSeconds(session) {
  if (!session || session.phase !== 'focus') return 0;
  return Math.max(0, Number(session.durationSeconds) || 0);
}

function dayKey(value) {
  return formatDateInput(value);
}

function shiftDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

// Focus seconds per local day, keyed "YYYY-MM-DD".
export function focusByDay(sessions = []) {
  const totals = new Map();
  sessions.forEach((session) => {
    const seconds = focusSeconds(session);
    if (!seconds) return;
    const key = dayKey(session.endedAt || session.startedAt);
    if (!key) return;
    totals.set(key, (totals.get(key) || 0) + seconds);
  });
  return totals;
}

// A streak is consecutive days with any focus time. Today not being studied yet
// does not break the streak until the day is over.
export function computeStreaks(sessions = [], now = new Date()) {
  const totals = focusByDay(sessions);
  const today = startOfDay(now);

  let current = 0;
  let cursor = totals.has(dayKey(today)) ? today : shiftDays(today, -1);
  while (totals.has(dayKey(cursor))) {
    current += 1;
    cursor = shiftDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let previous = null;
  Array.from(totals.keys())
    .sort()
    .forEach((key) => {
      const date = new Date(`${key}T12:00:00`);
      const consecutive = previous && Math.round((date - previous) / 86400000) === 1;
      run = consecutive ? run + 1 : 1;
      best = Math.max(best, run);
      previous = date;
    });

  return { current, best: Math.max(best, current), activeDays: totals.size, studiedToday: totals.has(dayKey(today)) };
}

export function dailySeries(sessions = [], days = 7, now = new Date()) {
  const totals = focusByDay(sessions);
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDays(today, index - (days - 1));
    return {
      date: dayKey(date),
      label: date.toLocaleDateString(undefined, days > 10 ? { day: 'numeric' } : { weekday: 'short' }),
      longLabel: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      seconds: totals.get(dayKey(date)) || 0,
      isToday: index === days - 1,
    };
  });
}

// Weeks (Monday first) for a contribution-style heatmap, oldest first.
export function heatmapWeeks(sessions = [], weeks = 18, now = new Date()) {
  const totals = focusByDay(sessions);
  const today = startOfDay(now);
  const firstMonday = shiftDays(startOfWeek(now), -7 * (weeks - 1));
  const max = Math.max(1, ...totals.values());
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_unused, day) => {
      const date = shiftDays(firstMonday, week * 7 + day);
      const seconds = totals.get(dayKey(date)) || 0;
      return {
        date: dayKey(date),
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        seconds,
        future: date.getTime() > today.getTime(),
        level: seconds === 0 ? 0 : Math.min(4, 1 + Math.floor((seconds / max) * 3.999)),
      };
    })
  );
}

// Focus seconds by the hour of day the session ended in.
export function hourlyDistribution(sessions = []) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, seconds: 0 }));
  sessions.forEach((session) => {
    const seconds = focusSeconds(session);
    if (!seconds) return;
    const date = new Date(session.endedAt || session.startedAt);
    if (Number.isNaN(date.getTime())) return;
    hours[date.getHours()].seconds += seconds;
  });
  return hours;
}

export function focusByTask(sessions = []) {
  const totals = new Map();
  sessions.forEach((session) => {
    const seconds = focusSeconds(session);
    if (!seconds || !session.taskId) return;
    totals.set(session.taskId, (totals.get(session.taskId) || 0) + seconds);
  });
  return totals;
}

export function formatHour(hour) {
  const suffix = hour < 12 ? 'am' : 'pm';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${suffix}`;
}

export function peakHour(sessions = []) {
  const best = hourlyDistribution(sessions).reduce((top, item) => (item.seconds > top.seconds ? item : top), {
    hour: null,
    seconds: 0,
  });
  return best.seconds > 0 ? best.hour : null;
}

export function subtaskProgress(task) {
  const list = Array.isArray(task?.subtasks) ? task.subtasks : [];
  return { total: list.length, done: list.filter((item) => item.done).length };
}
