import { describe, expect, it } from 'vitest';
import { AppError, toErrorPayload } from '../../lib/errors.js';

describe('error payloads', () => {
  it('keeps application error messages', () => {
    const payload = toErrorPayload(new AppError('VALIDATION', 'Title cannot be empty.'));
    expect(payload).toEqual({
      ok: false,
      code: 'VALIDATION',
      message: 'Title cannot be empty.',
      details: null,
    });
  });

  it('does not leak unexpected filesystem messages', () => {
    const payload = toErrorPayload(new Error("ENOENT: no such file or directory, open '/Users/me/secret.json'"));
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe('UNEXPECTED');
    expect(payload.message).not.toMatch(/Users/);
    expect(payload.message).not.toMatch(/secret\.json/);
  });
});
