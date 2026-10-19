import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../../electron/services/storage.js';
import { FocusDeskStore } from '../../electron/services/store.js';
import { createIpcHandlers, dispatchIpc } from '../../electron/ipc/handlers.js';

async function setup() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-ipc-'));
  const store = new FocusDeskStore(new JsonStore({ dataDir: dir }));
  await store.initialize();
  const handlers = createIpcHandlers(store);
  return {
    store,
    invoke: (channel, ...args) => dispatchIpc(handlers, channel, ...args),
  };
}

describe('IPC handlers', () => {
  it('lists, creates, updates, and deletes tasks through IPC', async () => {
    const { invoke } = await setup();

    const created = await invoke('tasks:create', { title: 'IPC task', priority: 'medium' });
    expect(created.ok).toBe(true);
    expect(created.data.title).toBe('IPC task');

    const listed = await invoke('tasks:list');
    expect(listed.data.some((task) => task.id === created.data.id)).toBe(true);

    const updated = await invoke('tasks:update', created.data.id, { status: 'completed' });
    expect(updated.data.status).toBe('completed');

    const removed = await invoke('tasks:remove', created.data.id);
    expect(removed.ok).toBe(true);
    expect((await invoke('tasks:list')).data).toHaveLength(0);
  });

  it('loads and saves settings through IPC', async () => {
    const { invoke } = await setup();
    const saved = await invoke('settings:update', { theme: 'light' });
    expect(saved.ok).toBe(true);
    expect(saved.data.theme).toBe('light');
    const loaded = await invoke('settings:get');
    expect(loaded.data.theme).toBe('light');
  });

  it('rejects invalid payloads with structured errors', async () => {
    const { invoke } = await setup();
    const result = await invoke('tasks:create', { title: '' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('VALIDATION');
  });

  it('persists a session through IPC', async () => {
    const { invoke } = await setup();
    const result = await invoke('sessions:create', {
      phase: 'focus',
      startedAt: '2026-03-11T10:00:00.000Z',
      endedAt: '2026-03-11T10:25:00.000Z',
      durationSeconds: 1500,
      completed: true,
    });
    expect(result.ok).toBe(true);
    expect((await invoke('sessions:list')).data).toHaveLength(1);
  });

  it('rejects empty subject names', async () => {
    const { invoke } = await setup();
    const result = await invoke('subjects:create', { name: '   ' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('VALIDATION');
  });

  it('does not send a notification without a title and body', async () => {
    const { invoke } = await setup();
    const result = await invoke('notifications:session', {});
    expect(result.ok).toBe(true);
    expect(result.data.shown).toBe(false);
    expect(result.data.reason).toBe('invalid');
  });

  it('rejects unknown channels with a structured error', async () => {
    const { invoke } = await setup();
    const result = await invoke('not:a-channel');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('UNKNOWN_CHANNEL');
  });

  it('rejects an invalid timer payload', async () => {
    const { invoke } = await setup();
    const result = await invoke('timer:save', ['running']);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('VALIDATION');
  });
});
