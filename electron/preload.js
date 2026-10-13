const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('focusDesk', {
  app: {
    bootstrap: () => invoke('app:bootstrap'),
    recover: (name) => invoke('app:recover', name),
    minimize: () => ipcRenderer.send('window:minimize'),
    onNavigate: (handler) => {
      const listener = (_event, page) => handler(page);
      ipcRenderer.on('app:navigate', listener);
      return () => ipcRenderer.removeListener('app:navigate', listener);
    },
    onCommand: (handler) => {
      const listener = (_event, command) => handler(command);
      ipcRenderer.on('app:command', listener);
      return () => ipcRenderer.removeListener('app:command', listener);
    },
  },
  tasks: {
    list: () => invoke('tasks:list'),
    create: (data) => invoke('tasks:create', data),
    update: (id, data) => invoke('tasks:update', id, data),
    remove: (id) => invoke('tasks:remove', id),
  },
  subjects: {
    list: () => invoke('subjects:list'),
    create: (data) => invoke('subjects:create', data),
    update: (id, data) => invoke('subjects:update', id, data),
    remove: (id) => invoke('subjects:remove', id),
  },
  sessions: {
    list: () => invoke('sessions:list'),
    create: (data) => invoke('sessions:create', data),
  },
  settings: {
    get: () => invoke('settings:get'),
    update: (data) => invoke('settings:update', data),
    resetPreferences: () => invoke('settings:resetPreferences'),
  },
  timer: {
    save: (state) => invoke('timer:save', state),
    heartbeat: (state) => invoke('timer:heartbeat', state),
  },
  statistics: {
    get: () => invoke('statistics:get'),
  },
  notifications: {
    session: (payload) => invoke('notifications:session', payload),
  },
  data: {
    exportJson: () => invoke('export:json'),
    exportCsv: (kind) => invoke('export:csv', kind),
    importJson: () => invoke('import:json'),
  },
});
