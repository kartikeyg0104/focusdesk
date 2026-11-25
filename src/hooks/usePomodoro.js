import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createIdleState,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  skipTimer,
  completeTimer,
  remainingMs,
  durationMsForPhase,
  restoreTimerState,
} from '../utils/pomodoro.js';
import { desktopApi } from '../services/desktopApi.js';

// The timer state only changes on start/pause/finish. The ticking clock lives in
// useTimerClock, so only the components that draw the countdown re-render every
// second instead of the whole app.
export function usePomodoro({ settings, initialState, onSession, onComplete, onError }) {
  const [state, setState] = useState(() => restoreTimerState(initialState || createIdleState()));
  const stateRef = useRef(state);
  const completingRef = useRef(false);
  const recordedIds = useRef(new Set());
  const settingsRef = useRef(settings);
  const callbacks = useRef({ onSession, onComplete, onError });

  settingsRef.current = settings;
  callbacks.current = { onSession, onComplete, onError };

  const persist = useCallback(async (next, immediate = true) => {
    try {
      if (immediate) await desktopApi.timer.save(next);
      else await desktopApi.timer.heartbeat(next);
    } catch (error) {
      callbacks.current.onError?.(error);
    }
  }, []);

  const apply = useCallback(
    async (next, options = {}) => {
      stateRef.current = next;
      setState(next);
      await persist(next, options.immediate !== false);
    },
    [persist]
  );

  const recordSnapshot = useCallback(async (snapshot) => {
    if (!snapshot) return null;
    if (snapshot.completionId && recordedIds.current.has(snapshot.completionId)) return null;
    try {
      const session = await desktopApi.sessions.create(snapshot);
      if (snapshot.completionId) recordedIds.current.add(snapshot.completionId);
      callbacks.current.onSession?.(session);
      return session;
    } catch (error) {
      callbacks.current.onError?.(error);
      return null;
    }
  }, []);

  const start = useCallback(
    (extras = {}) => apply(startTimer(stateRef.current, settingsRef.current, new Date(), extras)),
    [apply]
  );
  const pause = useCallback(() => apply(pauseTimer(stateRef.current, new Date())), [apply]);
  const resume = useCallback(
    () => apply(resumeTimer(stateRef.current, settingsRef.current, new Date())),
    [apply]
  );

  const toggle = useCallback(() => {
    const status = stateRef.current.status;
    if (status === 'running') return pause();
    if (status === 'paused') return resume();
    return start();
  }, [pause, resume, start]);

  const reset = useCallback(async () => {
    const result = resetTimer(stateRef.current, settingsRef.current, new Date());
    await recordSnapshot(result.snapshot);
    await apply(result.nextState);
  }, [apply, recordSnapshot]);

  const skip = useCallback(async () => {
    const result = skipTimer(stateRef.current, settingsRef.current, new Date());
    await recordSnapshot(result.snapshot);
    await apply(result.nextState);
  }, [apply, recordSnapshot]);

  // Pick focus / short break / long break while nothing is running.
  const selectPhase = useCallback(
    (phase) => {
      if (stateRef.current.status !== 'idle') return Promise.resolve();
      return apply({ ...stateRef.current, phase });
    },
    [apply]
  );

  // "+5 min" while a block is in progress.
  const addMinutes = useCallback(
    (minutes) => {
      const current = stateRef.current;
      const extra = minutes * 60 * 1000;
      if (current.status === 'running' && current.endsAt) {
        return apply({ ...current, endsAt: new Date(new Date(current.endsAt).getTime() + extra).toISOString() });
      }
      if (current.status === 'paused') {
        return apply({ ...current, pausedRemainingMs: (current.pausedRemainingMs || 0) + extra });
      }
      return Promise.resolve();
    },
    [apply]
  );

  const setTask = useCallback(
    (task) => apply({ ...stateRef.current, taskId: task?.id || null, subjectId: task?.subjectId || null }),
    [apply]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = stateRef.current;
      if (current.status !== 'running' || completingRef.current) return;
      if (remainingMs(current, new Date()) > 0) return;

      completingRef.current = true;
      const result = completeTimer(current, settingsRef.current, new Date());
      const prefs = settingsRef.current;
      const autoStart = result.nextState.phase === 'focus' ? prefs.autoStartFocus : prefs.autoStartBreaks;
      const next = autoStart ? startTimer(result.nextState, prefs, new Date()) : result.nextState;

      Promise.resolve()
        .then(async () => {
          await recordSnapshot(result.snapshot);
          await apply(next);
          callbacks.current.onComplete?.({ finishedPhase: current.phase, nextPhase: next.phase, autoStarted: autoStart });
        })
        .catch((error) => callbacks.current.onError?.(error))
        .finally(() => {
          completingRef.current = false;
        });
    }, 250);
    return () => window.clearInterval(interval);
  }, [apply, recordSnapshot]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (stateRef.current.status === 'running') persist(stateRef.current, false);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [persist]);

  useEffect(() => {
    function flush() {
      if (stateRef.current.status === 'running') persist(stateRef.current, true);
    }
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [persist]);

  return {
    state,
    duration: durationMsForPhase(state.phase, settings),
    start,
    pause,
    resume,
    toggle,
    reset,
    skip,
    selectPhase,
    addMinutes,
    setTask,
  };
}

// Remaining milliseconds for the current block, refreshed a few times a second
// while it runs. Use this only in components that show the countdown.
export function useTimerClock(timer) {
  const { state, duration } = timer;
  const read = useCallback(
    () => (state.status === 'idle' ? duration : remainingMs(state, new Date())),
    [duration, state]
  );
  const [remaining, setRemaining] = useState(read);

  useEffect(() => {
    setRemaining(read());
    if (state.status !== 'running') return undefined;
    const interval = window.setInterval(() => setRemaining(read()), 250);
    return () => window.clearInterval(interval);
  }, [read, state.status]);

  const total = Math.max(duration, remaining, 1);
  return { remaining, progress: Math.min(1, Math.max(0, 1 - remaining / total)) };
}
