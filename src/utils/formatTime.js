export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours <= 0 && minutes <= 0) {
    return seconds === 0 ? '0m' : `${seconds}s`;
  }
  if (hours <= 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function priorityLabel(value) {
  if (value === 'high') return 'High';
  if (value === 'low') return 'Low';
  return 'Medium';
}

export function statusLabel(value) {
  if (value === 'in_progress') return 'In progress';
  if (value === 'completed') return 'Completed';
  return 'To do';
}

export function phaseLabel(value) {
  if (value === 'shortBreak') return 'Short break';
  if (value === 'longBreak') return 'Long break';
  return 'Focus';
}

// Short, human label for a due date plus a tone used for colouring.
export function dueInfo(task, now = new Date()) {
  if (!task?.dueDate) return null;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const startOf = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOf(due) - startOf(now)) / 86400000);
  const done = task.status === 'completed';
  if (days < 0) {
    return { label: done ? formatShort(due) : `${-days}d overdue`, tone: done ? 'muted' : 'danger', days };
  }
  if (days === 0) return { label: 'Today', tone: done ? 'muted' : 'warning', days };
  if (days === 1) return { label: 'Tomorrow', tone: done ? 'muted' : 'accent', days };
  if (days < 7) return { label: due.toLocaleDateString(undefined, { weekday: 'long' }), tone: 'muted', days };
  return { label: formatShort(due), tone: 'muted', days };
}

function formatShort(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function relativeTime(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.round((now - date) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatShort(date);
}
