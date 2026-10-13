const { persistRunningState } = require('../../lib/pomodoro');
const { AppError, ok, toErrorPayload } = require('../../lib/errors');

function createIpcHandlers(store, extras = {}) {
  const notify = extras.notifyIfEnabled || (() => ({ shown: false, reason: 'disabled' }));
  const appInfo = extras.appInfo || {
    getVersion: () => '1.0.0',
    getPath: () => '',
    platform: 'test',
  };

  return {
    'app:bootstrap': async () => ({
      ...store.snapshot(),
      version: appInfo.getVersion(),
      userDataPath: appInfo.getPath(),
      platform: appInfo.platform,
    }),
    'app:recover': async (name) => store.recoverCollection(name),
    'tasks:list': async () => store.listTasks(),
    'tasks:create': async (payload) => store.createTask(payload),
    'tasks:update': async (id, payload) => store.updateTask(id, payload),
    'tasks:remove': async (id) => store.removeTask(id),
    'subjects:list': async () => store.listSubjects(),
    'subjects:create': async (payload) => store.createSubject(payload),
    'subjects:update': async (id, payload) => store.updateSubject(id, payload),
    'subjects:remove': async (id) => store.removeSubject(id),
    'sessions:list': async () => store.listSessions(),
    'sessions:create': async (payload) => store.createSession(payload),
    'settings:get': async () => store.getSettings(),
    'settings:update': async (payload) => store.updateSettings(payload),
    'settings:resetPreferences': async () =>
      store.updateSettings(
        {
          theme: 'dark',
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
        },
        { replacePreferences: true }
      ),
    'timer:save': async (timerState) => store.saveTimerState(timerState),
    'timer:heartbeat': async (timerState) =>
      store.saveTimerState(persistRunningState(timerState, new Date())),
    'statistics:get': async () => store.statistics(),
    'notifications:session': async (payload = {}) => {
      const { kind, title, body } = payload || {};
      if (!title || !body) {
        return { shown: false, reason: 'invalid' };
      }
      const settings = store.getSettings();
      const flag = kind === 'break' ? 'notifyBreakComplete' : 'notifyFocusComplete';
      return notify(settings, flag, { title, body });
    },
  };
}

async function dispatchIpc(handlers, channel, ...args) {
  try {
    if (!handlers[channel]) {
      throw new AppError('UNKNOWN_CHANNEL', 'Unknown request.');
    }
    const data = await handlers[channel](...args);
    return ok(data);
  } catch (error) {
    return toErrorPayload(error);
  }
}

module.exports = { createIpcHandlers, dispatchIpc };
