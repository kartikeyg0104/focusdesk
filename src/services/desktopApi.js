function unwrap(result) {
  if (!result || result.ok === false) {
    const error = new Error(result?.message || 'The desktop request failed.');
    error.code = result?.code || 'UNEXPECTED';
    error.details = result?.details || null;
    throw error;
  }
  return result.data;
}

function missingApi() {
  const error = new Error('FocusDesk must be opened through the Electron app.');
  error.code = 'NO_DESKTOP_API';
  throw error;
}

function api() {
  if (!window.focusDesk) missingApi();
  return window.focusDesk;
}

export const desktopApi = {
  available() {
    return Boolean(window.focusDesk);
  },
  bootstrap: () => api().app.bootstrap().then(unwrap),
  recover: (name) => api().app.recover(name).then(unwrap),
  onNavigate: (handler) => api().app.onNavigate(handler),
  onCommand: (handler) => api().app.onCommand(handler),
  tasks: {
    list: () => api().tasks.list().then(unwrap),
    create: (data) => api().tasks.create(data).then(unwrap),
    update: (id, data) => api().tasks.update(id, data).then(unwrap),
    remove: (id) => api().tasks.remove(id).then(unwrap),
  },
  subjects: {
    list: () => api().subjects.list().then(unwrap),
    create: (data) => api().subjects.create(data).then(unwrap),
    update: (id, data) => api().subjects.update(id, data).then(unwrap),
    remove: (id) => api().subjects.remove(id).then(unwrap),
  },
  sessions: {
    list: () => api().sessions.list().then(unwrap),
    create: (data) => api().sessions.create(data).then(unwrap),
  },
  settings: {
    get: () => api().settings.get().then(unwrap),
    update: (data) => api().settings.update(data).then(unwrap),
    resetPreferences: () => api().settings.resetPreferences().then(unwrap),
  },
  timer: {
    save: (state) => api().timer.save(state).then(unwrap),
    heartbeat: (state) => api().timer.heartbeat(state).then(unwrap),
  },
  statistics: {
    get: () => api().statistics.get().then(unwrap),
  },
  notifications: {
    session: (payload) => api().notifications.session(payload).then(unwrap),
  },
  data: {
    exportJson: () => api().data.exportJson().then(unwrap),
    exportCsv: (kind) => api().data.exportCsv(kind).then(unwrap),
    importJson: () => api().data.importJson().then(unwrap),
  },
};
