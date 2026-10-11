const {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isBeforeDay,
  eachDayOfInterval,
  inLocalRange,
  parseDate,
  formatDateInput,
} = require('./date');

function isFocusSession(session) {
  return Boolean(session && session.phase === 'focus');
}

function focusSeconds(session) {
  if (!isFocusSession(session)) return 0;
  return Math.max(0, Number(session.durationSeconds) || 0);
}

function completedFocusSeconds(session) {
  if (!isFocusSession(session) || !session.completed) return 0;
  return focusSeconds(session);
}

function sessionsInRange(sessions, start, end, field = 'endedAt') {
  return (sessions || []).filter((session) => inLocalRange(session[field] || session.startedAt, start, end));
}

function sumFocusSeconds(sessions, { completedOnly = false } = {}) {
  return (sessions || []).reduce((total, session) => {
    const amount = completedOnly ? completedFocusSeconds(session) : focusSeconds(session);
    return total + amount;
  }, 0);
}

function countCompletedFocus(sessions) {
  return (sessions || []).filter((session) => isFocusSession(session) && session.completed).length;
}

function averageCompletedFocusSeconds(sessions) {
  const completed = (sessions || []).filter((session) => isFocusSession(session) && session.completed);
  if (completed.length === 0) return 0;
  return Math.round(sumFocusSeconds(completed, { completedOnly: true }) / completed.length);
}

function taskMetrics(tasks, now = new Date()) {
  const list = tasks || [];
  const completed = list.filter((task) => task.status === 'completed');
  const remaining = list.filter((task) => task.status !== 'completed');
  const overdue = remaining.filter((task) => task.dueDate && isBeforeDay(task.dueDate, now));
  const dueToday = remaining.filter((task) => task.dueDate && isSameDay(task.dueDate, now));
  const completedToday = completed.filter((task) => task.completedAt && isSameDay(task.completedAt, now));

  return {
    total: list.length,
    completed: completed.length,
    remaining: remaining.length,
    overdue: overdue.length,
    dueToday: dueToday.length,
    completedToday: completedToday.length,
  };
}

function dailyFocusSeries(sessions, days = 7, now = new Date()) {
  const end = startOfDay(now);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return eachDayOfInterval(start, end).map((day) => {
    const focused = sessionsInRange(sessions, startOfDay(day), endOfDay(day));
    return {
      date: formatDateInput(day),
      label: day.toLocaleDateString(undefined, { weekday: 'short' }),
      seconds: sumFocusSeconds(focused),
      completedSessions: countCompletedFocus(focused),
    };
  });
}

function subjectDistribution(sessions, subjects, { completedOnly = false } = {}) {
  const totals = new Map();
  (sessions || []).forEach((session) => {
    const seconds = completedOnly ? completedFocusSeconds(session) : focusSeconds(session);
    if (!seconds) return;
    const key = session.subjectId || 'unassigned';
    totals.set(key, (totals.get(key) || 0) + seconds);
  });

  const named = (subjects || []).map((subject) => ({
    id: subject.id,
    name: subject.name,
    color: subject.color,
    seconds: totals.get(subject.id) || 0,
  }));

  if (totals.get('unassigned')) {
    named.push({
      id: 'unassigned',
      name: 'Unassigned',
      color: '#969EB0',
      seconds: totals.get('unassigned'),
    });
  }

  return named.sort((left, right) => right.seconds - left.seconds);
}

function upcomingTasks(tasks, limit = 5, now = new Date()) {
  return (tasks || [])
    .filter(
      (task) =>
        task.status !== 'completed' &&
        task.dueDate &&
        !isBeforeDay(task.dueDate, now) &&
        !isSameDay(task.dueDate, now)
    )
    .sort((left, right) => parseDate(left.dueDate) - parseDate(right.dueDate))
    .slice(0, limit);
}

function computeStatistics({ tasks = [], sessions = [], subjects = [], now = new Date() } = {}) {
  const todaySessions = sessionsInRange(sessions, startOfDay(now), endOfDay(now));
  const weekSessions = sessionsInRange(sessions, startOfWeek(now), endOfWeek(now));
  const monthSessions = sessionsInRange(sessions, startOfMonth(now), endOfMonth(now));
  const tasksToday = taskMetrics(tasks, now);

  return {
    studySecondsToday: sumFocusSeconds(todaySessions),
    studySecondsWeek: sumFocusSeconds(weekSessions),
    studySecondsMonth: sumFocusSeconds(monthSessions),
    completedFocusToday: countCompletedFocus(todaySessions),
    completedFocusWeek: countCompletedFocus(weekSessions),
    completedFocusAll: countCompletedFocus(sessions),
    averageFocusSeconds: averageCompletedFocusSeconds(sessions),
    tasks: tasksToday,
    daily: dailyFocusSeries(sessions, 7, now),
    subjects: subjectDistribution(sessions, subjects),
    upcoming: upcomingTasks(tasks, 6, now),
  };
}

exports.isFocusSession = isFocusSession;
exports.focusSeconds = focusSeconds;
exports.completedFocusSeconds = completedFocusSeconds;
exports.sessionsInRange = sessionsInRange;
exports.sumFocusSeconds = sumFocusSeconds;
exports.countCompletedFocus = countCompletedFocus;
exports.averageCompletedFocusSeconds = averageCompletedFocusSeconds;
exports.taskMetrics = taskMetrics;
exports.dailyFocusSeries = dailyFocusSeries;
exports.subjectDistribution = subjectDistribution;
exports.upcomingTasks = upcomingTasks;
exports.computeStatistics = computeStatistics;
