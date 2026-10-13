const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
const { JsonStore } = require('./services/storage');
const { FocusDeskStore } = require('./services/store');
const { registerIpc } = require('./ipc/register');
const { createApplicationMenu } = require('./services/shortcuts');
const { checkReminders } = require('./services/reminders');

let mainWindow = null;
let store = null;
let reminderTimer = null;

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';

function applyContentSecurityPolicy() {
  const policy = app.isPackaged
    ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'"
    : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws://127.0.0.1:5173 http://127.0.0.1:5173";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy],
      },
    });
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 680,
    show: false,
    backgroundColor: '#0B0D12',
    title: 'FocusDesk',
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = app.isPackaged
      ? url.startsWith('file:')
      : url.startsWith(DEV_SERVER_URL) || url.startsWith('file:');
    if (!allowed) event.preventDefault();
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL(DEV_SERVER_URL);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

async function bootstrap() {
  const dataDir = path.join(app.getPath('userData'), 'data');
  store = new FocusDeskStore(new JsonStore({ dataDir }));
  await store.initialize();
  registerIpc(store);
  applyContentSecurityPolicy();
  createMainWindow();
  createApplicationMenu(() => mainWindow);

  reminderTimer = setInterval(() => {
    checkReminders(store).catch((error) => {
      console.error('[focusdesk] reminder check failed', error.message);
    });
  }, 60 * 1000);

  checkReminders(store).catch(() => {});
}

app.whenReady().then(() => {
  bootstrap().catch((error) => {
    console.error('[focusdesk] failed to start', error);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (reminderTimer) clearInterval(reminderTimer);
});
