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

export function usePomodoro({ settings, initialState, onSession, onNotify, onError }) {
  const [state, setState] = useState(() => restoreTimerState(initialState || createIdleState()));
  const [now, setNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  const completingRef = useRef(false);
  const recordedIds = useRef(new Set());
  const settingsRef = useRef(settings);
  const onSessionRef = useRef(onSession);
  const onNotifyRef = useRef(onNotify);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    onSessionRef.current = onSession;
    onNotifyRef.current = onNotify;
    onErrorRef.current = onError;
  }, [onError, onNotify, onSession]);

  const persist = useCallback(async (next, immediate = true) => {
    try {
      if (immediate) {
        await desktopApi.timer.save(next);
      } else {
        await desktopApi.timer.heartbeat(next);
      }
    } catch (error) {
      onErrorRef.current?.(error);
    }
  }, []);

  const apply = useCallback(async (next, options = {}) => {
    setState(next);
    await persist(next, options.immediate !== false);
  }, [persist]);

  const recordSnapshot = useCallback(async (snapshot) => {
    if (!snapshot) return null;
    if (snapshot.completionId && recordedIds.current.has(snapshot.completionId)) {
      return null;
    }
    try {
      const session = await desktopApi.sessions.create(snapshot);
      if (snapshot.completionId) recordedIds.current.add(snapshot.completionId);
      onSessionRef.current?.(session);
      return session;
    } catch (error) {
      onErrorRef.current?.(error);
      return null;
    }
  }, []);

  const start = useCallback(
    async (extras = {}) => {
      const next = startTimer(stateRef.current, settingsRef.current, new Date(), extras);
      await apply(next);
    },
    [apply]
  );

  const pause = useCallback(async () => {
    const next = pauseTimer(stateRef.current, new Date());
    await apply(next);
  }, [apply]);

  const resume = useCallback(async () => {
    const next = resumeTimer(stateRef.current, settingsRef.current, new Date());
    await apply(next);
  }, [apply]);

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
      const current = stateRef.current;
      if (current.status !== 'running' || completingRef.current) return;
      if (remainingMs(current, new Date()) > 0) return;

      completingRef.current = true;
      const result = completeTimer(current, settingsRef.current, new Date());
      Promise.resolve()
        .then(async () => {
          await recordSnapshot(result.snapshot);
          await apply(result.nextState);
          const focusDone = current.phase === 'focus';
          onNotifyRef.current?.({
            kind: focusDone ? 'focus' : 'break',
            title: focusDone ? 'Focus session complete' : 'Break complete',
            body: focusDone
              ? 'Time for a break. Your session was saved.'
              : 'Break finished. Start the next focus block when you are ready.',
          });
        })
        .catch((error) => onErrorRef.current?.(error))
        .finally(() => {
          completingRef.current = false;
        });
    }, 250);

    return () => window.clearInterval(interval);
  }, [apply, recordSnapshot]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (stateRef.current.status === 'running') {
        persist(stateRef.current, false);
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [persist]);

  useEffect(() => {
    function flush() {
      if (stateRef.current.status === 'running') {
        persist(stateRef.current, true);
      }
    }
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [persist]);

  const phaseDuration = durationMsForPhase(state.phase, settings);
  const remaining = state.status === 'idle' ? phaseDuration : remainingMs(state, new Date(now));

  return {
    state,
    remaining,
    duration: phaseDuration,
    start,
    pause,
    resume,
    reset,
    skip,
    setTask: async (task) => {
      const next = {
        ...stateRef.current,
        taskId: task?.id || null,
        subjectId: task?.subjectId || null,
      };
      await apply(next);
    },
  };
}
