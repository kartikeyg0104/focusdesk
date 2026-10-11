const { isSameDay, isBeforeDay, parseDate } = require('./date');

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const STATUS_RANK = { in_progress: 0, todo: 1, completed: 2 };

function matchesSearch(task, query) {
  if (!query) return true;
  const haystack = `${task.title} ${task.description || ''}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function matchesDueFilter(task, dueFilter, now = new Date()) {
  if (!dueFilter || dueFilter === 'all') return true;
  if (dueFilter === 'none') return !task.dueDate;
  if (dueFilter === 'today') return Boolean(task.dueDate && isSameDay(task.dueDate, now));
  if (dueFilter === 'overdue') {
    return Boolean(
      task.dueDate &&
        task.status !== 'completed' &&
        isBeforeDay(task.dueDate, now)
    );
  }
  if (dueFilter === 'upcoming') {
    return Boolean(task.dueDate && !isBeforeDay(task.dueDate, now) && !isSameDay(task.dueDate, now));
  }
  return true;
}

function filterTasks(tasks, filters = {}, now = new Date()) {
  const list = Array.isArray(tasks) ? tasks : [];
  const {
    query = '',
    status = 'all',
    priority = 'all',
    subjectId = 'all',
    due = 'all',
  } = filters;

  return list.filter((task) => {
    if (!matchesSearch(task, query)) return false;
    if (status !== 'all' && task.status !== status) return false;
    if (priority !== 'all' && task.priority !== priority) return false;
    if (subjectId === 'unassigned' && task.subjectId) return false;
    if (subjectId !== 'all' && subjectId !== 'unassigned' && task.subjectId !== subjectId) {
      return false;
    }
    return matchesDueFilter(task, due, now);
  });
}

function compareTasks(left, right, sortBy = 'dueDate') {
  if (sortBy === 'priority') {
    return (PRIORITY_RANK[left.priority] ?? 9) - (PRIORITY_RANK[right.priority] ?? 9);
  }

  if (sortBy === 'title') {
    return String(left.title || '').localeCompare(String(right.title || ''), undefined, {
      sensitivity: 'base',
    });
  }

  if (sortBy === 'createdAt') {
    return (parseDate(right.createdAt)?.getTime() || 0) - (parseDate(left.createdAt)?.getTime() || 0);
  }

  const leftDue = parseDate(left.dueDate);
  const rightDue = parseDate(right.dueDate);
  if (!leftDue && !rightDue) return STATUS_RANK[left.status] - STATUS_RANK[right.status];
  if (!leftDue) return 1;
  if (!rightDue) return -1;
  return leftDue.getTime() - rightDue.getTime();
}

function sortTasks(tasks, sortBy = 'dueDate') {
  return [...(Array.isArray(tasks) ? tasks : [])].sort((left, right) =>
    compareTasks(left, right, sortBy)
  );
}

function queryTasks(tasks, filters = {}, now = new Date()) {
  return sortTasks(filterTasks(tasks, filters, now), filters.sortBy || 'dueDate');
}

exports.PRIORITY_RANK = PRIORITY_RANK;
exports.filterTasks = filterTasks;
exports.sortTasks = sortTasks;
exports.queryTasks = queryTasks;
exports.matchesDueFilter = matchesDueFilter;
