const { Menu, app } = require('electron');

function createApplicationMenu(getWindow) {
  const send = (channel, payload) => {
    const window = getWindow();
    if (!window) return;
    window.webContents.send(channel, payload);
  };

  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Settings',
                accelerator: 'CmdOrCtrl+,',
                click: () => send('app:navigate', 'settings'),
              },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Task',
          accelerator: 'CmdOrCtrl+N',
          click: () => send('app:command', 'new-task'),
        },
        {
          label: 'Quick Search',
          accelerator: 'CmdOrCtrl+K',
          click: () => send('app:command', 'quick-search'),
        },
        ...(!isMac
          ? [
              { type: 'separator' },
              {
                label: 'Settings',
                accelerator: 'CmdOrCtrl+,',
                click: () => send('app:navigate', 'settings'),
              },
              { role: 'quit' },
            ]
          : []),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Dashboard',
          click: () => send('app:navigate', 'dashboard'),
        },
        {
          label: 'Tasks',
          click: () => send('app:navigate', 'tasks'),
        },
        {
          label: 'Focus Timer',
          click: () => send('app:navigate', 'focus'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { createApplicationMenu };
