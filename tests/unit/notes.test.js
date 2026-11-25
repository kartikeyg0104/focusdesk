import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { JsonStore } from '../../electron/services/storage.js';
import { FocusDeskStore } from '../../electron/services/store.js';
import { validateImportPayload } from '../../lib/export.js';
import { normalizeSettings, validateSettingsPatch } from '../../lib/settings.js';

async function makeStore() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-notes-'));
  const store = new FocusDeskStore(new JsonStore({ dataDir }));
  await store.initialize();
  return { store, dataDir };
}

describe('notes, subtasks, and tags', () => {
  it('creates, updates, persists, and removes notes', async () => {
    const { store, dataDir } = await makeStore();
    const note = await store.createNote({ title: '  Lecture 4 ', body: 'Eigenvalues' });
    expect(note.title).toBe('Lecture 4');
    const updated = await store.updateNote(note.id, { body: 'Eigenvalues and eigenvectors', pinned: true });
    expect(updated.pinned).toBe(true);

    const reloaded = new FocusDeskStore(new JsonStore({ dataDir }));
    await reloaded.initialize();
    expect(reloaded.listNotes()[0].body).toBe('Eigenvalues and eigenvectors');

    await reloaded.removeNote(note.id);
    expect(reloaded.listNotes()).toEqual([]);
    await expect(reloaded.updateNote(note.id, { body: 'x' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('unlinks notes when their subject is deleted', async () => {
    const { store } = await makeStore();
    const subject = store.listSubjects()[0];
    const note = await store.createNote({ title: 'Linked', subjectId: subject.id });
    expect(note.subjectId).toBe(subject.id);
    await store.removeSubject(subject.id);
    expect(store.listNotes()[0].subjectId).toBeNull();
  });

  it('stores cleaned subtasks and tags on tasks', async () => {
    const { store } = await makeStore();
    const task = await store.createTask({
      title: 'Essay',
      subtasks: [{ title: ' Outline ' }, { title: '' }, { title: 'Draft', done: true }],
      tags: ['#Writing', 'writing', ' Urgent '],
    });
    expect(task.subtasks.map((item) => [item.title, item.done])).toEqual([
      ['Outline', false],
      ['Draft', true],
    ]);
    expect(task.subtasks[0].id).toBeTruthy();
    expect(task.tags).toEqual(['writing', 'urgent']);

    const toggled = await store.updateTask(task.id, {
      subtasks: task.subtasks.map((item) => ({ ...item, done: true })),
    });
    expect(toggled.subtasks.every((item) => item.done)).toBe(true);
    await expect(store.createTask({ title: 'Bad', tags: 'nope' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('exports notes and still accepts backups made before notes existed', async () => {
    const { store } = await makeStore();
    await store.createNote({ title: 'Kept', body: 'text' });
    const exported = store.exportData();
    expect(exported.notes).toHaveLength(1);
    expect(validateImportPayload(exported).notes[0].title).toBe('Kept');

    const legacy = { ...exported };
    delete legacy.notes;
    expect(validateImportPayload(legacy).notes).toEqual([]);
  });

  it('normalizes the new appearance and timer preferences', () => {
    const settings = normalizeSettings({ theme: 'system', accent: 'nope', ambientVolume: 400, autoStartBreaks: true });
    expect(settings.theme).toBe('system');
    expect(settings.accent).toBe('violet');
    expect(settings.ambientVolume).toBe(100);
    expect(settings.autoStartBreaks).toBe(true);
    expect(() => validateSettingsPatch({ accent: 'neon' })).toThrow(/accent/i);
  });
});
