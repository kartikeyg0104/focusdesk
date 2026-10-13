const { Notification } = require('electron');

function canNotify() {
  return Boolean(Notification && Notification.isSupported && Notification.isSupported());
}

function showNotification({ title, body, silent = false }) {
  if (!canNotify()) {
    return { shown: false, reason: 'unsupported' };
  }

  try {
    const notification = new Notification({
      title,
      body,
      silent,
    });
    notification.show();
    return { shown: true };
  } catch (error) {
    console.error('[focusdesk] notification failed', error.message);
    return { shown: false, reason: 'failed' };
  }
}

function notifyIfEnabled(settings, flag, payload) {
  if (!settings.notificationsEnabled || !settings[flag]) {
    return { shown: false, reason: 'disabled' };
  }
  return showNotification(payload);
}

module.exports = { canNotify, showNotification, notifyIfEnabled };
