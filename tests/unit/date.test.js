import { describe, expect, it } from 'vitest';
import { startOfWeek, startOfDay, isSameDay, greetingFor, formatDateInput } from '../../lib/date.js';

describe('date helpers', () => {
  it('uses local midnight and Monday week starts', () => {
    const wednesday = new Date(2026, 2, 11, 18, 30, 0);
    const week = startOfWeek(wednesday);
    expect(week.getDay()).toBe(1);
    expect(week.getHours()).toBe(0);
    expect(isSameDay(startOfDay(wednesday), wednesday)).toBe(true);
  });

  it('formats local date inputs and greetings', () => {
    const morning = new Date(2026, 2, 11, 8, 0, 0);
    expect(greetingFor(morning)).toBe('Good morning');
    expect(formatDateInput(morning)).toBe('2026-03-11');
  });
});
