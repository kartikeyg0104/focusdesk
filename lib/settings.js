const { DEFAULT_SETTINGS, PAGES, TIMER_PHASES, TIMER_STATUSES } = require('./defaults');
const { AppError } = require('./errors');
const { isId } = require('./ids');
const { isValidIsoDate } = require('./date');

const THEMES = ['dark', 'light'];

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function asBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function normalizeTimerState(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const phase = TIMER_PHASES.includes(raw.phase) ? raw.phase : 'focus';
  const status = TIMER_STATUSES.includes(raw.status) ? raw.status : 'idle';

  return {
    phase,
    status,
    startedAt: isValidIsoDate(raw.startedAt) ? raw.startedAt : null,
    endsAt: isValidIsoDate(raw.endsAt) ? raw.endsAt : null,
    pausedRemainingMs:
      Number.isFinite(Number(raw.pausedRemainingMs)) && Number(raw.pausedRemainingMs) >= 0
        ? Math.round(Number(raw.pausedRemainingMs))
        : null,
    lastPersistAt: isValidIsoDate(raw.lastPersistAt) ? raw.lastPersistAt : null,
    sessionStartedAt: isValidIsoDate(raw.sessionStartedAt) ? raw.sessionStartedAt : null,
    activeElapsedMs:
      Number.isFinite(Number(raw.activeElapsedMs)) && Number(raw.activeElapsedMs) >= 0
        ? Math.round(Number(raw.activeElapsedMs))
        : 0,
    completedFocusCount: clampInt(raw.completedFocusCount, 0, 10000, 0),
    taskId: isId(raw.taskId) ? raw.taskId : null,
    subjectId: isId(raw.subjectId) ? raw.subjectId : null,
    completionId: isId(raw.completionId) ? raw.completionId : null,
  };
}

function normalizeSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};

  return {
    theme: THEMES.includes(source.theme) ? source.theme : DEFAULT_SETTINGS.theme,
    studentName: typeof source.studentName === 'string' ? source.studentName.trim().slice(0, 80) : '',
    focusMinutes: clampInt(source.focusMinutes, 1, 180, DEFAULT_SETTINGS.focusMinutes),
    shortBreakMinutes: clampInt(source.shortBreakMinutes, 1, 60, DEFAULT_SETTINGS.shortBreakMinutes),
    longBreakMinutes: clampInt(source.longBreakMinutes, 1, 90, DEFAULT_SETTINGS.longBreakMinutes),
    longBreakInterval: clampInt(source.longBreakInterval, 2, 12, DEFAULT_SETTINGS.longBreakInterval),
    notificationsEnabled: asBoolean(source.notificationsEnabled, true),
    notifyFocusComplete: asBoolean(source.notifyFocusComplete, true),
    notifyBreakComplete: asBoolean(source.notifyBreakComplete, true),
    notifyDeadlines: asBoolean(source.notifyDeadlines, true),
    notifyDailyGoal: asBoolean(source.notifyDailyGoal, true),
    dailyGoalMinutes: clampInt(source.dailyGoalMinutes, 15, 720, DEFAULT_SETTINGS.dailyGoalMinutes),
    startPage: PAGES.includes(source.startPage) ? source.startPage : DEFAULT_SETTINGS.startPage,
    notifiedDeadlineKeys: Array.isArray(source.notifiedDeadlineKeys)
      ? source.notifiedDeadlineKeys.filter((key) => typeof key === 'string').slice(-200)
      : [],
    notifiedDailyGoalDates: Array.isArray(source.notifiedDailyGoalDates)
      ? source.notifiedDailyGoalDates.filter((key) => typeof key === 'string').slice(-60)
      : [],
    timerState: normalizeTimerState(source.timerState),
  };
}

function validateSettingsPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new AppError('INVALID_SETTINGS', 'Settings must be an object.');
  }

  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  const unknown = Object.keys(patch).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new AppError('INVALID_SETTINGS', `Unknown settings: ${unknown.join(', ')}.`);
  }

  if (patch.theme !== undefined && !THEMES.includes(patch.theme)) {
    throw new AppError('INVALID_SETTINGS', 'Theme must be dark or light.');
  }

  if (patch.startPage !== undefined && !PAGES.includes(patch.startPage)) {
    throw new AppError('INVALID_SETTINGS', 'Start page is not valid.');
  }

  const minuteFields = [
    'focusMinutes',
    'shortBreakMinutes',
    'longBreakMinutes',
    'longBreakInterval',
    'dailyGoalMinutes',
  ];

  minuteFields.forEach((field) => {
    if (patch[field] !== undefined && !Number.isFinite(Number(patch[field]))) {
      throw new AppError('INVALID_SETTINGS', `${field} must be a number.`);
    }
  });

  return true;
}

function settingsDocument(raw) {
  return {
    version: 1,
    data: normalizeSettings(raw && raw.data ? raw.data : raw),
  };
}

module.exports = {
  THEMES,
  normalizeSettings,
  normalizeTimerState,
  validateSettingsPatch,
  settingsDocument,
};
