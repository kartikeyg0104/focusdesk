import { describe, expect, it } from 'vitest';
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  completeTimer,
  resetTimer,
  skipTimer,
  remainingMs,
  restoreTimerState,
  nextPhaseAfter,
  createIdleState,
} from '../../lib/pomodoro.js';

const settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

describe('pomodoro transitions', () => {
  it('starts from timestamps instead of trusting interval ticks', () => {
    const started = startTimer(createIdleState(), settings, new Date('2026-03-11T10:00:00.000Z'));
    const later = new Date('2026-03-11T10:10:00.000Z');
    expect(remainingMs(started, later)).toBe(15 * 60 * 1000);
  });

  it('does not count paused time as remaining decay', () => {
    const started = startTimer(createIdleState(), settings, new Date('2026-03-11T10:00:00.000Z'));
    const paused = pauseTimer(started, new Date('2026-03-11T10:05:00.000Z'));
    expect(paused.status).toBe('paused');
    expect(paused.pausedRemainingMs).toBe(20 * 60 * 1000);
    expect(remainingMs(paused, new Date('2026-03-11T12:00:00.000Z'))).toBe(20 * 60 * 1000);
    const resumed = resumeTimer(paused, settings, new Date('2026-03-11T12:00:00.000Z'));
    expect(remainingMs(resumed, new Date('2026-03-11T12:00:00.000Z'))).toBe(20 * 60 * 1000);
  });

  it('records a completed focus session once and offers a long break after the interval', () => {
    const started = startTimer(
      { ...createIdleState(), completedFocusCount: 3 },
      settings,
      new Date('2026-03-11T10:00:00.000Z')
    );
    const result = completeTimer(started, settings, new Date('2026-03-11T10:25:00.000Z'));
    expect(result.snapshot.completed).toBe(true);
    expect(result.snapshot.phase).toBe('focus');
    expect(result.snapshot.durationSeconds).toBe(25 * 60);
    expect(result.nextState.phase).toBe('longBreak');
    expect(nextPhaseAfter('focus', 4, settings)).toBe('longBreak');
  });

  it('does not treat a reset as a completed session', () => {
    const started = startTimer(createIdleState(), settings, new Date('2026-03-11T10:00:00.000Z'));
    const result = resetTimer(started, settings, new Date('2026-03-11T10:04:00.000Z'));
    expect(result.snapshot.completed).toBe(false);
    expect(result.snapshot.interrupted).toBe(true);
    expect(result.nextState.status).toBe('idle');
  });

  it('restores a running session as paused without counting closed time', () => {
    const started = startTimer(createIdleState(), settings, new Date('2026-03-11T10:00:00.000Z'));
    started.lastPersistAt = '2026-03-11T10:05:00.000Z';
    const restored = restoreTimerState(started, new Date('2026-03-11T18:00:00.000Z'));
    expect(restored.status).toBe('paused');
    expect(restored.pausedRemainingMs).toBe(20 * 60 * 1000);
  });

  it('skip records an interruption and advances the phase without counting a completion', () => {
    const started = startTimer(createIdleState(), settings, new Date('2026-03-11T10:00:00.000Z'));
    const result = skipTimer(started, settings, new Date('2026-03-11T10:02:00.000Z'));
    expect(result.snapshot.completed).toBe(false);
    expect(result.nextState.phase).toBe('shortBreak');
    expect(result.nextState.completedFocusCount).toBe(0);
  });

  it('does not offer a long break after zero completed sessions', () => {
    const started = startTimer(createIdleState(), settings, new Date('2026-03-11T10:00:00.000Z'));
    const skipped = skipTimer(started, settings, new Date('2026-03-11T10:01:00.000Z'));
    expect(skipped.nextState.phase).toBe('shortBreak');
  });

  it('does not mark a zero-duration completion as a finished session', () => {
    const started = startTimer(createIdleState(), settings, new Date('2026-03-11T10:00:00.000Z'));
    const result = completeTimer(started, settings, new Date('2026-03-11T10:00:00.000Z'));
    expect(result.snapshot.completed).toBe(false);
    expect(result.nextState.completedFocusCount).toBe(0);
  });
});
