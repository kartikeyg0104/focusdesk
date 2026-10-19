import { describe, expect, it } from 'vitest';
import { normalizeSettings, validateSettingsPatch } from '../../lib/settings.js';

describe('settings', () => {
  it('clamps durations and drops unknown keys', () => {
    const settings = normalizeSettings({
      theme: 'light',
      focusMinutes: 400,
      shortBreakMinutes: 0,
      extra: true,
    });
    expect(settings.theme).toBe('light');
    expect(settings.focusMinutes).toBe(180);
    expect(settings.shortBreakMinutes).toBe(1);
    expect(settings.extra).toBeUndefined();
  });

  it('rejects invalid patches', () => {
    expect(() => validateSettingsPatch({ theme: 'solarized' })).toThrow(/theme/i);
    expect(() => validateSettingsPatch({ mystery: 1 })).toThrow(/unknown/i);
  });
});
