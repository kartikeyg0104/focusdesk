import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../../electron/services/storage.js';

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-'));
}

describe('json storage', () => {
  it('creates missing files and writes atomically', async () => {
    const dir = await tempDir();
    const store = new JsonStore({ dataDir: dir });
    const created = await store.load('tasks', { version: 1, items: [] });
    expect(created.created).toBe(true);
    await store.save('tasks', { version: 1, items: [{ id: '1' }] });
    const loaded = await store.load('tasks', { version: 1, items: [] });
    expect(loaded.data.items[0].id).toBe('1');
  });

  it('preserves malformed files and reports them', async () => {
    const dir = await tempDir();
    const file = path.join(dir, 'settings.json');
    await fs.writeFile(file, '{not-json', 'utf8');
    const store = new JsonStore({ dataDir: dir });
    await expect(store.load('settings', { version: 1, data: {} })).rejects.toMatchObject({
      code: 'MALFORMED_DATA',
    });
    const original = await fs.readFile(file, 'utf8');
    expect(original).toBe('{not-json');
    const backups = (await fs.readdir(dir)).filter((name) => name.includes('corrupt'));
    expect(backups.length).toBe(1);
  });

  it('keeps the original file when a write fails', async () => {
    const dir = await tempDir();
    const store = new JsonStore({ dataDir: dir });
    await store.save('tasks', { version: 1, items: [{ id: '1' }] });
    const failing = new JsonStore({
      dataDir: dir,
      fsImpl: {
        mkdir: (...args) => fs.mkdir(...args),
        readFile: (...args) => fs.readFile(...args),
        writeFile: async () => {
          throw new Error('ENOSPC');
        },
        rename: (...args) => fs.rename(...args),
        unlink: (...args) => fs.unlink(...args),
      },
    });
    await expect(failing.save('tasks', { version: 1, items: [] })).rejects.toMatchObject({
      code: 'STORAGE_WRITE',
    });
    const loaded = await store.load('tasks', { version: 1, items: [] });
    expect(loaded.data.items[0].id).toBe('1');
  });
});
