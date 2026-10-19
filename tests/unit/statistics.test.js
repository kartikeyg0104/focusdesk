import { describe, expect, it } from 'vitest';
import { computeStatistics, sumFocusSeconds } from '../../lib/statistics.js';

const now = new Date(2026, 2, 11, 15, 0, 0);

describe('statistics', () => {
  it('returns zeros for empty data', () => {
    const stats = computeStatistics({ now });
    expect(stats.studySecondsToday).toBe(0);
    expect(stats.completedFocusAll).toBe(0);
    expect(stats.tasks.remaining).toBe(0);
    expect(stats.daily).toHaveLength(7);
  });

  it('counts only focus time and not breaks', () => {
    const sessions = [
      {
        phase: 'focus',
        completed: true,
        durationSeconds: 1500,
        endedAt: new Date(2026, 2, 11, 10, 0, 0).toISOString(),
        subjectId: 'math',
      },
      {
        phase: 'shortBreak',
        completed: true,
        durationSeconds: 300,
        endedAt: new Date(2026, 2, 11, 10, 5, 0).toISOString(),
        subjectId: 'math',
      },
      {
        phase: 'focus',
        completed: false,
        durationSeconds: 120,
        endedAt: new Date(2026, 2, 11, 11, 0, 0).toISOString(),
        subjectId: 'math',
      },
    ];
    const tasks = [
      { status: 'completed', completedAt: new Date(2026, 2, 11, 9, 0, 0).toISOString() },
      { status: 'todo', dueDate: new Date(2026, 2, 10, 9, 0, 0).toISOString() },
    ];
    const stats = computeStatistics({
      sessions,
      tasks,
      subjects: [{ id: 'math', name: 'Math', color: '#8B7CFF' }],
      now,
    });
    expect(sumFocusSeconds(sessions)).toBe(1620);
    expect(stats.studySecondsToday).toBe(1620);
    expect(stats.completedFocusToday).toBe(1);
    expect(stats.tasks.overdue).toBe(1);
    expect(stats.tasks.completedToday).toBe(1);
    expect(stats.subjects[0].seconds).toBe(1620);
  });

  it('assigns study time to the local day the session ended', () => {
    const now = new Date(2026, 2, 11, 0, 30, 0);
    const yesterday = new Date(2026, 2, 10, 23, 45, 0);
    const today = new Date(2026, 2, 11, 0, 10, 0);
    const stats = computeStatistics({
      sessions: [
        {
          phase: 'focus',
          completed: true,
          durationSeconds: 600,
          endedAt: yesterday.toISOString(),
        },
        {
          phase: 'focus',
          completed: true,
          durationSeconds: 900,
          endedAt: today.toISOString(),
        },
      ],
      now,
    });
    expect(stats.studySecondsToday).toBe(900);
    expect(stats.completedFocusToday).toBe(1);
  });

  it('lists upcoming deadlines after today, not due-today tasks', () => {
    const now = new Date(2026, 9, 20, 15, 0, 0);
    const stats = computeStatistics({
      tasks: [
        {
          title: 'Due today',
          status: 'todo',
          dueDate: new Date(2026, 9, 20, 12, 0, 0).toISOString(),
        },
        {
          title: 'Due tomorrow',
          status: 'todo',
          dueDate: new Date(2026, 9, 21, 12, 0, 0).toISOString(),
        },
        {
          title: 'Overdue',
          status: 'todo',
          dueDate: new Date(2026, 9, 1, 12, 0, 0).toISOString(),
        },
      ],
      now,
    });
    expect(stats.tasks.dueToday).toBe(1);
    expect(stats.tasks.overdue).toBe(1);
    expect(stats.upcoming.map((task) => task.title)).toEqual(['Due tomorrow']);
  });
});
