const { ipcMain } = require('electron');
const { ok, toErrorPayload } = require('../../lib/errors');

function handleInvoke(channel, handler) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      const data = await handler(...args);
      return ok(data);
    } catch (error) {
      console.error(`[focusdesk] ${channel} failed`, error);
      return toErrorPayload(error);
    }
  });
}

module.exports = { handleInvoke };
