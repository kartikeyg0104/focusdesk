const TIMER_PHASES = ['focus', 'shortBreak', 'longBreak'];
const TIMER_STATUSES = ['idle', 'running', 'paused'];

function normalizeTimerState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const phase = TIMER_PHASES.includes(raw.phase) ? raw.phase : 'focus';
  const status = TIMER_STATUSES.includes(raw.status) ? raw.status : 'idle';
  return {
    phase,
    status,
    startedAt: raw.startedAt || null,
    endsAt: raw.endsAt || null,
    pausedRemainingMs: Number.isFinite(Number(raw.pausedRemainingMs)) ? Number(raw.pausedRemainingMs) : null,
    lastPersistAt: raw.lastPersistAt || null,
    sessionStartedAt: raw.sessionStartedAt || null,
    activeElapsedMs: Number.isFinite(Number(raw.activeElapsedMs)) ? Number(raw.activeElapsedMs) : 0,
    completedFocusCount: Number(raw.completedFocusCount) || 0,
    taskId: raw.taskId || null,
    subjectId: raw.subjectId || null,
    completionId: raw.completionId || null,
  };
}

export function durationMsForPhase(phase, settings) {
  if (phase === 'shortBreak') return settings.shortBreakMinutes * 60 * 1000;
  if (phase === 'longBreak') return settings.longBreakMinutes * 60 * 1000;
  return settings.focusMinutes * 60 * 1000;
}

export function remainingMs(state, now = new Date()) {
  if (!state || state.status === 'idle') return 0;
  if (state.status === 'paused') return Math.max(0, state.pausedRemainingMs || 0);
  if (!state.endsAt) return 0;
  return Math.max(0, new Date(state.endsAt).getTime() - now.getTime());
}

export function createIdleState(overrides = {}) {
  return {
    phase: overrides.phase || 'focus',
    status: 'idle',
    startedAt: null,
    endsAt: null,
    pausedRemainingMs: null,
    lastPersistAt: null,
    sessionStartedAt: null,
    activeElapsedMs: 0,
    completedFocusCount: overrides.completedFocusCount || 0,
    taskId: overrides.taskId ?? null,
    subjectId: overrides.subjectId ?? null,
    completionId: overrides.completionId || null,
  };
}

export function startTimer(state, settings, now = new Date(), extras = {}) {
  const current = state || createIdleState();
  const phase = extras.phase || current.phase || 'focus';
  const duration = extras.remainingMs ?? durationMsForPhase(phase, settings);
  const startedAt = now.toISOString();
  return {
    ...current,
    ...extras,
    phase,
    status: 'running',
    startedAt,
    endsAt: new Date(now.getTime() + duration).toISOString(),
    pausedRemainingMs: null,
    lastPersistAt: startedAt,
    sessionStartedAt: current.sessionStartedAt || extras.sessionStartedAt || startedAt,
    activeElapsedMs: extras.activeElapsedMs ?? current.activeElapsedMs ?? 0,
    completionId: extras.completionId || current.completionId || crypto.randomUUID(),
  };
}

export function pauseTimer(state, now = new Date()) {
  if (!state || state.status !== 'running') return state;
  const remaining = remainingMs(state, now);
  const elapsedThisRun = Math.max(0, now.getTime() - new Date(state.startedAt || now).getTime());
  return {
    ...state,
    status: 'paused',
    endsAt: null,
    startedAt: null,
    pausedRemainingMs: remaining,
    lastPersistAt: now.toISOString(),
    activeElapsedMs: (state.activeElapsedMs || 0) + elapsedThisRun,
  };
}

export function resumeTimer(state, settings, now = new Date()) {
  if (!state || state.status !== 'paused') return state;
  return startTimer(state, settings, now, {
    remainingMs: state.pausedRemainingMs ?? durationMsForPhase(state.phase, settings),
    sessionStartedAt: state.sessionStartedAt,
    activeElapsedMs: state.activeElapsedMs,
    taskId: state.taskId,
    subjectId: state.subjectId,
    completedFocusCount: state.completedFocusCount,
    phase: state.phase,
  });
}

function finishSnapshot(state, now, { completed, reason }) {
  if (!state || state.status === 'idle') return null;
  let activeElapsedMs = state.activeElapsedMs || 0;
  if (state.status === 'running' && state.startedAt) {
    activeElapsedMs += Math.max(0, now.getTime() - new Date(state.startedAt).getTime());
  }
  const durationSeconds = Math.max(0, Math.round(activeElapsedMs / 1000));
  if (durationSeconds <= 0 && !completed) return null;
  return {
    phase: state.phase,
    taskId: state.taskId || null,
    subjectId: state.subjectId || null,
    startedAt: state.sessionStartedAt || state.startedAt || now.toISOString(),
    endedAt: now.toISOString(),
    durationSeconds,
    completed: Boolean(completed && durationSeconds > 0 && state.phase),
    interrupted: !(completed && durationSeconds > 0),
    interruptionReason: completed && durationSeconds > 0 ? null : reason || 'empty',
    completionId: state.completionId || null,
  };
}

function nextPhaseAfter(completedPhase, completedFocusCount, settings) {
  if (completedPhase !== 'focus') return 'focus';
  if (!completedFocusCount) return 'shortBreak';
  return completedFocusCount % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
}

export function resetTimer(state, settings, now = new Date()) {
  return {
    nextState: createIdleState({
      phase: state?.phase || 'focus',
      completedFocusCount: state?.completedFocusCount || 0,
      taskId: state?.taskId || null,
      subjectId: state?.subjectId || null,
    }),
    snapshot: finishSnapshot(state, now, { completed: false, reason: 'reset' }),
  };
}

export function skipTimer(state, settings, now = new Date()) {
  const completedFocusCount = state?.completedFocusCount || 0;
  const phase =
    state?.phase === 'focus' ? nextPhaseAfter('focus', completedFocusCount, settings) : 'focus';
  return {
    nextState: createIdleState({
      phase,
      completedFocusCount,
      taskId: state?.taskId || null,
      subjectId: state?.subjectId || null,
    }),
    snapshot: finishSnapshot(state, now, { completed: false, reason: 'skip' }),
  };
}

export function completeTimer(state, settings, now = new Date()) {
  const snapshot = finishSnapshot(state, now, { completed: true, reason: null });
  const actuallyCompleted = Boolean(snapshot && snapshot.completed);
  const completedFocusCount =
    state?.phase === 'focus' && actuallyCompleted
      ? (state.completedFocusCount || 0) + 1
      : state?.completedFocusCount || 0;
  return {
    nextState: createIdleState({
      phase: nextPhaseAfter(state?.phase || 'focus', completedFocusCount, settings),
      completedFocusCount,
      taskId: state?.taskId || null,
      subjectId: state?.subjectId || null,
    }),
    snapshot,
  };
}

export function restoreTimerState(raw, now = new Date()) {
  const state = normalizeTimerState(raw);
  if (!state || state.status === 'idle') return state || createIdleState();
  if (state.status === 'running') {
    const persistAt = state.lastPersistAt || state.startedAt || now.toISOString();
    const remaining = Math.max(0, new Date(state.endsAt || persistAt).getTime() - new Date(persistAt).getTime());
    let activeElapsedMs = state.activeElapsedMs || 0;
    if (state.startedAt) {
      activeElapsedMs += Math.max(0, new Date(persistAt).getTime() - new Date(state.startedAt).getTime());
    }
    return {
      ...state,
      status: 'paused',
      startedAt: null,
      endsAt: null,
      pausedRemainingMs: remaining,
      lastPersistAt: now.toISOString(),
      activeElapsedMs,
    };
  }
  return state;
}
