import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from '../../src/utils/quickAdd.js';
import { computeStreaks, heatmapWeeks, dailySeries } from '../../src/utils/insights.js';

const subjects = [
  { id: 's1', name: 'Mathematics', color: '#8B7CFF' },
  { id: 's2', name: 'Computer Science', color: '#42D6B5' },
];
// Wednesday 25 Nov 2026, local time.
const now = new Date(2026, 10, 25, 9, 0, 0);

describe('parseQuickAdd', () => {
  it('pulls priority, tags, subject, estimate, and date out of one line', () => {
    const parsed = parseQuickAdd('Lab report fri !high #chem @comp 45m', { subjects, now });
    expect(parsed.title).toBe('Lab report');
    expect(parsed.priority).toBe('high');
    expect(parsed.tags).toEqual(['chem']);
    expect(parsed.subjectId).toBe('s2');
    expect(parsed.estimatedMinutes).toBe(45);
    const due = new Date(parsed.dueDate);
    expect([due.getFullYear(), due.getMonth(), due.getDate()]).toEqual([2026, 10, 27]);
  });

  it('understands tomorrow, hours, and relative days', () => {
    expect(new Date(parseQuickAdd('Essay tomorrow', { now }).dueDate).getDate()).toBe(26);
    expect(parseQuickAdd('Revise 1.5h', { now }).estimatedMinutes).toBe(90);
    expect(new Date(parseQuickAdd('Quiz prep in 3 days', { now }).dueDate).getDate()).toBe(28);
  });

  it('leaves plain text and unknown tokens in the title', () => {
    const parsed = parseQuickAdd('Friday review with @nobody', { subjects, now });
    expect(parsed.title).toBe('Friday review with @nobody');
    expect(parsed.dueDate).toBeNull();
    expect(parsed.subjectId).toBeNull();
  });
});

describe('insights', () => {
  const session = (daysAgo, seconds = 1500) => {
    const ended = new Date(now);
    ended.setDate(ended.getDate() - daysAgo);
    return { phase: 'focus', durationSeconds: seconds, endedAt: ended.toISOString() };
  };

  it('counts the current streak without breaking it before today is studied', () => {
    const streak = computeStreaks([session(1), session(2), session(3), session(6), session(7)], now);
    expect(streak.current).toBe(3);
    expect(streak.best).toBe(3);
    expect(streak.studiedToday).toBe(false);
    expect(computeStreaks([session(2)], now).current).toBe(0);
  });

  it('ignores breaks and builds fixed-size series', () => {
    const sessions = [session(0), { ...session(0), phase: 'shortBreak' }];
    const series = dailySeries(sessions, 7, now);
    expect(series).toHaveLength(7);
    expect(series[6].seconds).toBe(1500);
    const weeks = heatmapWeeks(sessions, 4, now);
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().filter((day) => day.seconds > 0)).toHaveLength(1);
  });
});
