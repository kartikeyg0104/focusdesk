import { describe, expect, it } from 'vitest';
import {
  validateTaskCreate,
  validateTaskUpdate,
  validateSubjectCreate,
  applyTaskStatus,
} from '../../lib/validation.js';

describe('task validation', () => {
  it('rejects empty or whitespace titles', () => {
    expect(() => validateTaskCreate({ title: '   ' })).toThrow(/empty/i);
    expect(() => validateTaskCreate({})).toThrow(/required/i);
  });

  it('creates a normalized task payload', () => {
    const task = validateTaskCreate({
      title: '  Lab report  ',
      description: 'Draft the methods section',
      priority: 'high',
      estimatedMinutes: 45,
    });
    expect(task.title).toBe('Lab report');
    expect(task.priority).toBe('high');
    expect(task.status).toBe('todo');
    expect(task.estimatedMinutes).toBe(45);
  });

  it('rejects unknown priority and status', () => {
    expect(() => validateTaskCreate({ title: 'X', priority: 'urgent' })).toThrow(/priority/i);
    expect(() => validateTaskUpdate({ status: 'done' })).toThrow(/status/i);
  });

  it('requires at least one update field', () => {
    expect(() => validateTaskUpdate({})).toThrow(/no valid/i);
  });

  it('rejects invalid due dates and estimated minutes', () => {
    expect(() => validateTaskCreate({ title: 'Lab', dueDate: 'not-a-date' })).toThrow(/date/i);
    expect(() => validateTaskCreate({ title: 'Lab', estimatedMinutes: -12 })).toThrow(/minutes/i);
  });

  it('marks completion timestamps when status changes', () => {
    const now = '2026-03-01T12:00:00.000Z';
    const completed = applyTaskStatus({ status: 'todo', completedAt: null }, 'completed', now);
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBe(now);
    const reopened = applyTaskStatus(completed, 'todo', '2026-03-01T13:00:00.000Z');
    expect(reopened.completedAt).toBeNull();
  });
});

describe('subject validation', () => {
  it('requires a name and hex color', () => {
    expect(() => validateSubjectCreate({ name: '  ' })).toThrow(/empty/i);
    expect(() => validateSubjectCreate({ name: 'Biology', color: 'blue' })).toThrow(/hex/i);
  });

  it('rejects a missing subject payload', () => {
    expect(() => validateSubjectCreate(null)).toThrow(/object/i);
  });
});
