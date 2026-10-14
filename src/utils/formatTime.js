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
