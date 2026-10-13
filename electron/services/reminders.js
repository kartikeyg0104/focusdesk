const { formatDateInput, isSameDay, isBeforeDay } = require('../../lib/date');
const { notifyIfEnabled } = require('./notifications');
const { sumFocusSeconds, sessionsInRange } = require('../../lib/statistics');
const { startOfDay, endOfDay } = require('../../lib/date');

function deadlineKey(task, now) {
  return `${task.id}:${formatDateInput(now)}`;
}

async function checkReminders(store, now = new Date()) {
  let settings;
  try {
    settings = store.getSettings();
  } catch (_error) {
    return { checked: false };
  }

  const notifications = [];
  const tasks = store.listTasks();
  const sessions = store.listSessions();
  const nextSettings = { ...settings };
  let changed = false;

  tasks.forEach((task) => {
    if (task.status === 'completed' || !task.dueDate) return;
    const dueToday = isSameDay(task.dueDate, now);
    const overdue = isBeforeDay(task.dueDate, now);
    if (!dueToday && !overdue) return;

    const key = deadlineKey(task, now);
    if (nextSettings.notifiedDeadlineKeys.includes(key)) return;

    const result = notifyIfEnabled(settings, 'notifyDeadlines', {
      title: overdue ? 'Overdue assignment' : 'Due today',
      body: overdue
        ? `${task.title} is overdue.`
        : `${task.title} is due today.`,
    });

    if (result.shown || result.reason === 'disabled' || result.reason === 'unsupported') {
      nextSettings.notifiedDeadlineKeys = [...nextSettings.notifiedDeadlineKeys, key].slice(-200);
      changed = true;
      notifications.push({ type: 'deadline', taskId: task.id, shown: result.shown });
    }
  });

  const todayKey = formatDateInput(now);
  if (!nextSettings.notifiedDailyGoalDates.includes(todayKey)) {
    const focused = sumFocusSeconds(sessionsInRange(sessions, startOfDay(now), endOfDay(now)));
    if (focused >= settings.dailyGoalMinutes * 60) {
      const result = notifyIfEnabled(settings, 'notifyDailyGoal', {
        title: 'Daily study goal reached',
        body: `You have studied for ${Math.round(focused / 60)} minutes today.`,
      });
      if (result.shown || result.reason === 'disabled' || result.reason === 'unsupported') {
        nextSettings.notifiedDailyGoalDates = [...nextSettings.notifiedDailyGoalDates, todayKey].slice(-60);
        changed = true;
        notifications.push({ type: 'dailyGoal', shown: result.shown });
      }
    }
  }

  if (changed) {
    await store.updateSettings({
      notifiedDeadlineKeys: nextSettings.notifiedDeadlineKeys,
      notifiedDailyGoalDates: nextSettings.notifiedDailyGoalDates,
    });
  }

  return { checked: true, notifications };
}

module.exports = { checkReminders, deadlineKey };
