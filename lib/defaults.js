const TASK_PRIORITIES = ['low', 'medium', 'high'];
const TASK_STATUSES = ['todo', 'in_progress', 'completed'];
const TIMER_PHASES = ['focus', 'shortBreak', 'longBreak'];
const TIMER_STATUSES = ['idle', 'running', 'paused'];
const DATA_VERSION = 1;

const DEFAULT_SUBJECTS = [
  {
    name: 'Mathematics',
    color: '#8B7CFF',
    description: 'Problem sets, exams, and recitation work.',
  },
  {
    name: 'Computer Science',
    color: '#42D6B5',
    description: 'Projects, labs, and reading.',
  },
  {
    name: 'Writing',
    color: '#F5C46A',
    description: 'Essays, reports, and citations.',
  },
  {
    name: 'Personal',
    color: '#6EA8FE',
    description: 'Non-course work that still needs a deadline.',
  },
];

const DEFAULT_SETTINGS = {
  theme: 'dark',
  studentName: '',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  notificationsEnabled: true,
  notifyFocusComplete: true,
  notifyBreakComplete: true,
  notifyDeadlines: true,
  notifyDailyGoal: true,
  dailyGoalMinutes: 120,
  startPage: 'dashboard',
  notifiedDeadlineKeys: [],
  notifiedDailyGoalDates: [],
  timerState: null,
};

const EMPTY_COLLECTION = Object.freeze({
  version: DATA_VERSION,
  items: [],
});

const PAGES = ['dashboard', 'tasks', 'subjects', 'focus', 'statistics', 'settings'];

function emptyCollection() {
  return { version: DATA_VERSION, items: [] };
}

module.exports = {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TIMER_PHASES,
  TIMER_STATUSES,
  DATA_VERSION,
  DEFAULT_SUBJECTS,
  DEFAULT_SETTINGS,
  EMPTY_COLLECTION,
  PAGES,
  emptyCollection,
};
