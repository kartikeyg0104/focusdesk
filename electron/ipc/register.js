const path = require('node:path');
const { ipcMain, dialog, app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const { handleInvoke } = require('../utils/invoke');
const { notifyIfEnabled } = require('../services/notifications');
const { createIpcHandlers } = require('./handlers');
const { validateImportPayload } = require('../../lib/export');
const { AppError } = require('../../lib/errors');

function registerIpc(store) {
  const handlers = createIpcHandlers(store, {
    notifyIfEnabled,
    appInfo: {
      getVersion: () => app.getVersion(),
      getPath: () => path.join(app.getPath('userData'), 'data'),
      platform: process.platform,
    },
  });

  Object.entries(handlers).forEach(([channel, handler]) => {
    handleInvoke(channel, handler);
  });

  handleInvoke('export:json', async () => {
    const window = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(window || undefined, {
      title: 'Export FocusDesk backup',
      defaultPath: `focusdesk-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }
    const payload = store.exportData();
    if (!payload || payload.app !== 'focusdesk' || !Array.isArray(payload.tasks)) {
      throw new AppError('EXPORT_FAILED', 'The export payload was not valid.');
    }
    try {
      await fs.writeFile(result.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    } catch (_error) {
      throw new AppError('EXPORT_FAILED', 'Could not write the backup file. Nothing in FocusDesk was changed.');
    }
    return { canceled: false, filePath: result.filePath };
  });

  handleInvoke('export:csv', async (kind) => {
    const isSessions = kind === 'sessions';
    const window = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(window || undefined, {
      title: isSessions ? 'Export study sessions' : 'Export tasks',
      defaultPath: `focusdesk-${isSessions ? 'sessions' : 'tasks'}-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }
    const csv = isSessions ? store.exportSessionsCsv() : store.exportTasksCsv();
    try {
      await fs.writeFile(result.filePath, csv, 'utf8');
    } catch (_error) {
      throw new AppError('EXPORT_FAILED', 'Could not write the CSV file. Nothing in FocusDesk was changed.');
    }
    return { canceled: false, filePath: result.filePath };
  });

  handleInvoke('import:json', async () => {
    const window = BrowserWindow.getFocusedWindow();
    const open = await dialog.showOpenDialog(window || undefined, {
      title: 'Restore FocusDesk backup',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (open.canceled || !open.filePaths[0]) {
      return { canceled: true };
    }

    const raw = await fs.readFile(open.filePaths[0], 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      throw new AppError('INVALID_IMPORT', 'The selected file is not valid JSON.');
    }

    validateImportPayload(parsed);

    const backup = store.exportData();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(app.getPath('userData'), `pre-restore-${stamp}.json`);
    try {
      await fs.writeFile(backupPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
    } catch (_error) {
      throw new AppError('IMPORT_FAILED', 'Could not write a pre-restore backup, so the import was cancelled.');
    }
    const restored = await store.restoreFromBackup(parsed);
    return { canceled: false, backupPath, snapshot: store.snapshot(), restored: restored.restored };
  });

  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
}

function removeIpc() {
  const channels = [
    'app:bootstrap',
    'app:recover',
    'tasks:list',
    'tasks:create',
    'tasks:update',
    'tasks:remove',
    'subjects:list',
    'subjects:create',
    'subjects:update',
    'subjects:remove',
    'sessions:list',
    'sessions:create',
    'settings:get',
    'settings:update',
    'settings:resetPreferences',
    'timer:save',
    'timer:heartbeat',
    'statistics:get',
    'notifications:session',
    'export:json',
    'export:csv',
    'import:json',
  ];
  channels.forEach((channel) => ipcMain.removeHandler(channel));
  ipcMain.removeAllListeners('window:minimize');
}

module.exports = { registerIpc, removeIpc };
