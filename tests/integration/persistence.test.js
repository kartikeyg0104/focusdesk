import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../../electron/services/storage.js';
import { FocusDeskStore } from '../../electron/services/store.js';

async function makeStore(dir, now = new Date('2026-03-11T12:00:00.000Z')) {
  const store = new FocusDeskStore(new JsonStore({ dataDir: dir }), { now: () => now });
  await store.initialize();
  return store;
}

describe('persistence integration', () => {
  it('creates a task, completes it, and still has it after reload', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-store-'));
    const store = await makeStore(dir);
    const subject = store.listSubjects()[0];
    const task = await store.createTask({
      title: 'Problem set 3',
      subjectId: subject.id,
      priority: 'high',
      dueDate: '2026-03-12T12:00:00.000Z',
    });

    await store.updateTask(task.id, { status: 'completed' });
    const stats = store.statistics();
    expect(stats.tasks.completed).toBe(1);

    const reloaded = await makeStore(dir);
    const saved = reloaded.listTasks().find((item) => item.id === task.id);
    expect(saved).toBeTruthy();
    expect(saved.status).toBe('completed');
    expect(saved.title).toBe('Problem set 3');
  });

  it('clears completedAt when a completed task is reopened', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-reopen-'));
    const store = await makeStore(dir);
    const task = await store.createTask({ title: 'Reopen me' });
    const completed = await store.updateTask(task.id, { status: 'completed' });
    expect(completed.completedAt).toBeTruthy();
    const reopened = await store.updateTask(task.id, { status: 'todo' });
    expect(reopened.status).toBe('todo');
    expect(reopened.completedAt).toBeNull();
  });

  it('persists theme preference and keeps tasks when preferences reset', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-settings-'));
    const store = await makeStore(dir);
    await store.createTask({ title: 'Keep me' });
    await store.updateSettings({ theme: 'light', focusMinutes: 40 });
    expect(store.getSettings().theme).toBe('light');

    const reloaded = await makeStore(dir);
    expect(reloaded.getSettings().theme).toBe('light');
    await reloaded.updateSettings(
      {
        theme: 'dark',
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        notificationsEnabled: true,
        notifyFocusComplete: true,
        notifyBreakComplete: true,
        notifyDeadlines: true,
        notifyDailyGoal: true,
        dailyGoalMinutes: 120,
        startPage: 'dashboard',
      },
      { replacePreferences: true }
    );
    expect(reloaded.listTasks()[0].title).toBe('Keep me');
    expect(reloaded.getSettings().focusMinutes).toBe(25);
  });

  it('records a completed focus session once and ignores break time', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-session-'));
    const store = await makeStore(dir, new Date('2026-03-11T15:00:00.000Z'));
    const first = await store.createSession({
      phase: 'focus',
      startedAt: '2026-03-11T14:00:00.000Z',
      endedAt: '2026-03-11T14:25:00.000Z',
      durationSeconds: 1500,
      completed: true,
    });
    await store.createSession({
      phase: 'shortBreak',
      startedAt: '2026-03-11T14:25:00.000Z',
      endedAt: '2026-03-11T14:30:00.000Z',
      durationSeconds: 300,
      completed: true,
    });
    const stats = store.statistics();
    expect(stats.completedFocusAll).toBe(1);
    expect(stats.studySecondsToday).toBe(1500);
    expect(store.listSessions().filter((session) => session.id === first.id)).toHaveLength(1);
  });

  it('unassigns tasks when a subject is deleted', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-subject-'));
    const store = await makeStore(dir);
    const subject = await store.createSubject({ name: 'Chemistry', color: '#42D6B5' });
    const task = await store.createTask({ title: 'Titration lab', subjectId: subject.id });
    await store.removeSubject(subject.id);
    expect(store.listTasks().find((item) => item.id === task.id).subjectId).toBeNull();
  });

  it('rejects invalid IPC-style payloads', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-invalid-'));
    const store = await makeStore(dir);
    await expect(store.createTask({ title: '   ' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(store.updateTask('missing', { title: 'Nope' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(store.updateSettings({ theme: 'neon' })).rejects.toMatchObject({ code: 'INVALID_SETTINGS' });
  });

  it('exports a valid backup and restores it', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-export-'));
    const store = await makeStore(dir);
    await store.createTask({ title: 'Export me' });
    const payload = store.exportData();
    expect(payload.app).toBe('focusdesk');
    expect(payload.tasks.some((task) => task.title === 'Export me')).toBe(true);

    await store.createTask({ title: 'Later work' });
    await store.restoreFromBackup(payload);
    expect(store.listTasks().some((task) => task.title === 'Later work')).toBe(false);
    expect(store.listTasks().some((task) => task.title === 'Export me')).toBe(true);
  });

  it('recovers a damaged collection without touching other files', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-recover-'));
    const store = await makeStore(dir);
    await store.createTask({ title: 'Safe task' });
    await fs.writeFile(path.join(dir, 'sessions.json'), '{broken', 'utf8');

    const recovered = await makeStore(dir);
    expect(recovered.snapshot().errors.some((error) => error.name === 'sessions')).toBe(true);
    expect(recovered.listTasks().some((task) => task.title === 'Safe task')).toBe(true);
    await recovered.recoverCollection('sessions');
    expect(recovered.listSessions()).toEqual([]);
  });

  it('rolls the in-memory cache back when a write fails', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-rollback-'));
    const store = await makeStore(dir);
    await store.createTask({ title: 'Kept' });
    const originalSave = store.storage.save.bind(store.storage);
    store.storage.save = async () => {
      throw new Error('disk full');
    };

    await expect(store.createTask({ title: 'Lost' })).rejects.toBeTruthy();
    expect(store.listTasks().map((task) => task.title)).toEqual(['Kept']);

    store.storage.save = originalSave;
    const reloaded = await makeStore(dir);
    expect(reloaded.listTasks().map((task) => task.title)).toEqual(['Kept']);
  });

  it('does not apply an invalid backup', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-import-'));
    const store = await makeStore(dir);
    await store.createTask({ title: 'Current work' });

    await expect(store.restoreFromBackup({ app: 'other', tasks: [], subjects: [], sessions: [] })).rejects.toMatchObject({
      code: 'INVALID_IMPORT',
    });
    expect(store.listTasks().some((task) => task.title === 'Current work')).toBe(true);
  });

  it('records a focus session only once for the same completion id', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'focusdesk-session-'));
    const store = await makeStore(dir);
    const payload = {
      phase: 'focus',
      startedAt: '2026-03-11T10:00:00.000Z',
      endedAt: '2026-03-11T10:25:00.000Z',
      durationSeconds: 1500,
      completed: true,
      completionId: 'completion-1',
    };
    const first = await store.createSession(payload);
    const second = await store.createSession(payload);
    expect(second.id).toBe(first.id);
    expect(store.listSessions()).toHaveLength(1);
  });
});
