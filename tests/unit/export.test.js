import { describe, expect, it } from 'vitest';
import { buildExportPayload, validateImportPayload, toCsv, TASK_CSV_COLUMNS } from '../../lib/export.js';

describe('export and import', () => {
  it('builds a versioned payload and accepts it back', () => {
    const payload = buildExportPayload({
      exportedAt: '2026-03-11T00:00:00.000Z',
      tasks: [
        {
          id: 't1',
          title: 'Read',
          description: '',
          subjectId: 's1',
          priority: 'low',
          status: 'todo',
          dueDate: null,
          estimatedMinutes: 20,
        },
      ],
      subjects: [{ id: 's1', name: 'History', color: '#8B7CFF', description: '' }],
      sessions: [
        {
          id: 'sess1',
          phase: 'focus',
          startedAt: '2026-03-11T10:00:00.000Z',
          endedAt: '2026-03-11T10:25:00.000Z',
          durationSeconds: 1500,
          completed: true,
        },
      ],
      settings: { theme: 'light' },
    });

    const imported = validateImportPayload(payload);
    expect(imported.tasks[0].title).toBe('Read');
    expect(imported.subjects[0].id).toBe('s1');
    expect(imported.settings.theme).toBe('light');
  });

  it('rejects malformed backups', () => {
    expect(() => validateImportPayload({ app: 'other' })).toThrow(/not created/i);
    expect(() => validateImportPayload({ tasks: [], subjects: [] })).toThrow(/missing/i);
    expect(() =>
      validateImportPayload({
        app: 'focusdesk',
        tasks: [{ title: 'No id' }],
        subjects: [{ id: 's1', name: 'Math', color: '#8B7CFF' }],
        sessions: [],
      })
    ).toThrow(/id/i);
  });

  it('writes utf-8 friendly csv', () => {
    const csv = toCsv([{ title: 'Essay, "draft"', id: '1' }], TASK_CSV_COLUMNS);
    expect(csv).toContain('"Essay, ""draft"""');
  });
});
