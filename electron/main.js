const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, session, nativeTheme } = require('electron');
const { JsonStore } = require('./services/storage');
const { FocusDeskStore } = require('./services/store');
const { registerIpc } = require('./ipc/register');
const { createApplicationMenu } = require('./services/shortcuts');
const { checkReminders } = require('./services/reminders');

let mainWindow = null;
let store = null;
let reminderTimer = null;

// The Vite dev server is used only when `npm run dev` asks for it. Every other
// launch (npm start, packaged builds) loads the built renderer from dist/, so
// the window is never pointed at a server that is not running.
const USE_DEV_SERVER = !app.isPackaged && process.env.FOCUSDESK_DEV === '1';
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
const RENDERER_INDEX = path.join(__dirname, '..', 'dist', 'index.html');

function applyContentSecurityPolicy() {
  const policy = USE_DEV_SERVER
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws://127.0.0.1:5173 http://127.0.0.1:5173"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy],
      },
    });
  });
}

function windowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function readWindowState() {
  try {
    const state = JSON.parse(fs.readFileSync(windowStatePath(), 'utf8'));
    if (Number.isFinite(state.width) && Number.isFinite(state.height)) return state;
  } catch (_error) {
    // First launch, or an unreadable file: fall back to the default size.
  }
  return {};
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const bounds = mainWindow.getNormalBounds();
    fs.writeFileSync(
      windowStatePath(),
      JSON.stringify({ ...bounds, maximized: mainWindow.isMaximized() }),
      'utf8'
    );
  } catch (_error) {
    // Losing the window position is not worth interrupting quit.
  }
}

function missingBuildPage() {
  const html = `<body style="margin:0;height:100vh;display:grid;place-items:center;background:#0a0b10;color:#eceef5;font-family:system-ui,sans-serif">
    <div style="max-width:440px;padding:32px;text-align:center">
      <h1 style="font-size:20px;margin:0 0 12px">FocusDesk has not been built yet</h1>
      <p style="color:#9aa3b5;line-height:1.6;margin:0">Run <code>npm start</code> to build and open the app, or <code>npm run dev</code> while developing.</p>
    </div></body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function createMainWindow() {
  const saved = readWindowState();
  mainWindow = new BrowserWindow({
    width: saved.width || 1320,
    height: saved.height || 860,
    x: saved.x,
    y: saved.y,
    minWidth: 980,
    minHeight: 680,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0b10' : '#f5f6fa',
    title: 'FocusDesk',
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
    },
  });

  if (saved.maximized) mainWindow.maximize();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = USE_DEV_SERVER ? url.startsWith(DEV_SERVER_URL) : url.startsWith('file:');
    if (!allowed) event.preventDefault();
  });

  if (USE_DEV_SERVER) {
    mainWindow.loadURL(DEV_SERVER_URL);
  } else if (fs.existsSync(RENDERER_INDEX)) {
    mainWindow.loadFile(RENDERER_INDEX);
  } else {
    mainWindow.loadURL(missingBuildPage());
  }

  mainWindow.on('close', saveWindowState);
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

// Two copies writing the same JSON files would corrupt them, so a second
// launch just focuses the window that is already open.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  // Windows only shows notifications for apps that declare an id.
  if (process.platform === 'win32') app.setAppUserModelId('com.focusdesk.app');

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
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (reminderTimer) clearInterval(reminderTimer);
});
