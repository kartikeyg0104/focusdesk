import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar, NAV_LINKS } from './components/Sidebar.jsx';
import { TopBar } from './components/TopBar.jsx';
import { Modal, ConfirmDialog } from './components/Modal.jsx';
import { TaskForm } from './components/TaskForm.jsx';
import { ToastStack } from './components/Toast.jsx';
import { CommandPalette } from './components/CommandPalette.jsx';
import { Icon } from './components/Icons.jsx';
import { fireConfetti } from './components/confetti.js';
import { Dashboard } from './pages/Dashboard.jsx';
import { Tasks } from './pages/Tasks.jsx';
import { Calendar } from './pages/Calendar.jsx';
import { Subjects } from './pages/Subjects.jsx';
import { Focus } from './pages/Focus.jsx';
import { Notes } from './pages/Notes.jsx';
import { Statistics } from './pages/Statistics.jsx';
import { Settings } from './pages/Settings.jsx';
import { useTasks, DEFAULT_FILTERS } from './hooks/useTasks.js';
import { useSubjects } from './hooks/useSubjects.js';
import { useNotes } from './hooks/useNotes.js';
import { useSettings } from './hooks/useSettings.js';
import { usePomodoro } from './hooks/usePomodoro.js';
import { useFeedback } from './hooks/useFeedback.js';
import { useSound } from './hooks/useSound.js';
import { desktopApi } from './services/desktopApi.js';
import { formatLongDate, greetingFor, isBeforeDay, isSameDay } from './utils/date.js';
import { computeStatistics } from './utils/statistics.js';
import { computeStreaks, focusByTask as computeFocusByTask } from './utils/insights.js';

const PAGE_IDS = NAV_LINKS.map((link) => link.id);

function Splash({ title, message }) {
  return (
    <div className="splash">
      <div className="aurora" aria-hidden="true" />
      <div className={`splash-mark ${title ? '' : 'is-loading'}`}>
        <Icon name="logo" size={34} strokeWidth={1.8} />
      </div>
      {title ? (
        <>
          <h1>{title}</h1>
          <p>{message}</p>
        </>
      ) : null}
    </div>
  );
}

export default function App() {
  const [boot, setBoot] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!desktopApi.available()) {
        setBoot({
          status: 'error',
          message: 'FocusDesk runs as a desktop app. Start it with “npm start” (or “npm run dev”) from the project folder.',
        });
        return;
      }
      try {
        const data = await desktopApi.bootstrap();
        if (!cancelled) setBoot({ status: 'ready', data });
      } catch (error) {
        if (!cancelled) setBoot({ status: 'error', message: error.message });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (boot.status === 'loading') return <Splash />;
  if (boot.status === 'error') return <Splash title="FocusDesk could not start" message={boot.message} />;
  return <ReadyApp initial={boot.data} />;
}

function useResolvedTheme(theme) {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  if (theme === 'system') return systemDark ? 'dark' : 'light';
  return theme === 'light' ? 'light' : 'dark';
}

function isTypingTarget(node) {
  if (!node) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
}

function ReadyApp({ initial }) {
  const [page, setPage] = useState(PAGE_IDS.includes(initial.settings.startPage) ? initial.settings.startPage : 'dashboard');
  const [taskModal, setTaskModal] = useState(null); // { task } to edit, { defaults } to create
  const [commandOpen, setCommandOpen] = useState(false);
  const [zen, setZen] = useState(false);
  const [sessions, setSessions] = useState(initial.sessions);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [loadErrors, setLoadErrors] = useState(initial.errors || []);
  const isMac = initial.platform === 'darwin';

  const feedback = useFeedback();
  const { pushToast } = feedback;
  const taskState = useTasks(initial.tasks);
  const subjectState = useSubjects(initial.subjects);
  const noteState = useNotes(initial.notes || []);
  const settingState = useSettings(initial.settings);
  const { settings } = settingState;
  const resolvedTheme = useResolvedTheme(settings.theme);
  const sound = useSound({ enabled: settings.soundEnabled, ambient: settings.ambientSound, volume: settings.ambientVolume });
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const timer = usePomodoro({
    settings,
    initialState: initial.settings.timerState,
    onSession: (session) => setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]),
    onComplete: ({ finishedPhase, autoStarted }) => {
      const focusDone = finishedPhase === 'focus';
      soundRef.current.play(focusDone ? 'complete' : 'break');
      if (focusDone) fireConfetti({ y: 0.4 });
      pushToast(
        focusDone
          ? `Focus block done.${autoStarted ? ' Break started.' : ' Time for a break.'}`
          : `Break over.${autoStarted ? ' Back to it.' : ' Ready when you are.'}`,
        'success'
      );
      desktopApi.notifications
        .session({
          kind: focusDone ? 'focus' : 'break',
          title: focusDone ? 'Focus session complete' : 'Break complete',
          body: focusDone ? 'Nice work. Your session was saved.' : 'Start the next focus block when you are ready.',
        })
        .catch(() => {});
    },
    onError: (error) => pushToast(error.message, 'error'),
  });

  // Theme, accent, and motion are plain attributes on <html>; the CSS does the rest.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.accent = settings.accent;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.dataset.motion = settings.reduceMotion || prefersReduced ? 'reduced' : 'full';
  }, [resolvedTheme, settings.accent, settings.reduceMotion]);

  const focusRunning = timer.state.status === 'running' && timer.state.phase === 'focus';
  const { setAmbientActive } = sound;
  useEffect(() => {
    setAmbientActive(focusRunning);
  }, [focusRunning, setAmbientActive]);

  // Cards marked .spot get a soft highlight that follows the pointer.
  useEffect(() => {
    function onMove(event) {
      const card = event.target.closest?.('.spot');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);

  const navigate = useCallback((next) => {
    if (!PAGE_IDS.includes(next)) return;
    setZen(false);
    setPage(next);
  }, []);

  const updateSettings = useCallback(
    async (patch) => {
      try {
        return await settingState.updateSettings(patch);
      } catch (error) {
        pushToast(error.message, 'error');
        throw error;
      }
    },
    [pushToast, settingState]
  );

  const toggleSidebar = useCallback(() => {
    updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed }).catch(() => {});
  }, [settings.sidebarCollapsed, updateSettings]);

  const toggleTheme = useCallback(() => {
    updateSettings({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' }).catch(() => {});
  }, [resolvedTheme, updateSettings]);

  useEffect(() => {
    const stopNav = desktopApi.onNavigate((nextPage) => navigate(nextPage));
    const stopCommand = desktopApi.onCommand((command) => {
      if (command === 'new-task') setTaskModal((current) => current || { defaults: {} });
      if (command === 'quick-search') setCommandOpen(true);
    });
    return () => {
      stopNav?.();
      stopCommand?.();
    };
  }, [navigate]);

  const overlayOpen = Boolean(taskModal) || commandOpen || Boolean(feedback.confirm);
  const toggleTimer = timer.toggle;
  const timerStatus = timer.state.status;

  useEffect(() => {
    function onKeyDown(event) {
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === 'k') {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (overlayOpen) return;
      if (mod && key === 'n') {
        event.preventDefault();
        setTaskModal({ defaults: {} });
      } else if (mod && key === ',') {
        event.preventDefault();
        navigate('settings');
      } else if (mod && key === 'b') {
        event.preventDefault();
        toggleSidebar();
      } else if (mod && /^[1-7]$/.test(key)) {
        event.preventDefault();
        navigate(PAGE_IDS[Number(key) - 1]);
      } else if (event.code === 'Space' && !mod) {
        // Space belongs to whatever control has focus; only take it when nothing does.
        const active = document.activeElement;
        if (isTypingTarget(active) || active?.tagName === 'BUTTON' || active?.tagName === 'A') return;
        if (page !== 'focus' && timerStatus === 'idle') return;
        event.preventDefault();
        toggleTimer();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, overlayOpen, page, timerStatus, toggleSidebar, toggleTimer]);

  const { tasks } = taskState;
  const { subjects } = subjectState;
  const stats = useMemo(() => computeStatistics({ tasks, sessions, subjects }), [sessions, subjects, tasks]);
  const streak = useMemo(() => computeStreaks(sessions), [sessions]);
  const focusByTask = useMemo(() => computeFocusByTask(sessions), [sessions]);

  const badges = useMemo(() => {
    const now = new Date();
    const open = tasks.filter((task) => task.status !== 'completed');
    const overdue = open.filter((task) => task.dueDate && isBeforeDay(task.dueDate, now)).length;
    const dueToday = open.filter((task) => task.dueDate && isSameDay(task.dueDate, now)).length;
    const count = overdue + dueToday;
    return count ? { tasks: { count, tone: overdue ? 'is-danger' : '' } } : {};
  }, [tasks]);

  // ---- task actions -------------------------------------------------------

  async function run(work, successMessage) {
    try {
      const result = await work();
      if (successMessage) pushToast(successMessage, 'success');
      return result;
    } catch (error) {
      pushToast(error.message, 'error');
      return null;
    }
  }

  async function toggleTask(task) {
    const completing = task.status !== 'completed';
    const previous = task.status;
    const updated = await run(() => taskState.updateTask(task.id, { status: completing ? 'completed' : 'todo' }));
    if (!updated) return;
    if (completing) {
      sound.play('check');
      fireConfetti({ count: 36, y: 0.5 });
      pushToast(`Completed “${task.title}”`, 'success', {
        action: { label: 'Undo', run: () => run(() => taskState.updateTask(task.id, { status: previous })) },
      });
      if (timer.state.taskId === task.id) timer.setTask(null);
    }
  }

  async function deleteTask(task) {
    const removed = await run(() => taskState.removeTask(task.id));
    if (removed === null) return;
    setTaskModal(null);
    if (timer.state.taskId === task.id) timer.setTask(null);
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, completedAt: _completedAt, ...fields } = task;
    pushToast(`Deleted “${task.title}”`, 'info', {
      action: { label: 'Undo', run: () => run(() => taskState.createTask(fields)) },
    });
  }

  async function focusTask(task) {
    navigate('focus');
    if (timer.state.status === 'idle') {
      await timer.start({ phase: 'focus', taskId: task.id, subjectId: task.subjectId || null });
      sound.play('start');
    } else {
      await timer.setTask(task);
    }
  }

  const actions = {
    navigate,
    openTask: (task) => setTaskModal({ task }),
    newTask: (defaults = {}) => setTaskModal({ defaults }),
    createTask: async (fields) => {
      // Throws on failure so forms can show the validation message inline.
      const task = await taskState.createTask(fields);
      pushToast('Task added', 'success');
      return task;
    },
    toggleTask,
    deleteTask,
    focusTask,
    startFocus: async () => {
      navigate('focus');
      if (timer.state.status === 'idle') {
        await timer.start({ phase: 'focus' });
        sound.play('start');
      }
    },
    moveTask: (task, status) => run(() => taskState.updateTask(task.id, { status })),
    toggleSubtask: (task, subtaskId) =>
      run(() =>
        taskState.updateTask(task.id, {
          subtasks: (task.subtasks || []).map((item) => (item.id === subtaskId ? { ...item, done: !item.done } : item)),
        })
      ),
  };

  // ---- notes, subjects, data ----------------------------------------------

  async function createNote(fields = {}) {
    const note = await run(() => noteState.createNote({ title: '', body: '', ...fields }));
    if (!note) return;
    setSelectedNoteId(note.id);
    navigate('notes');
  }

  async function deleteNote(note) {
    const removed = await run(() => noteState.removeNote(note.id));
    if (removed === null) return;
    setSelectedNoteId(null);
    pushToast(`Deleted “${note.title || 'Untitled note'}”`, 'info', {
      action: {
        label: 'Undo',
        run: async () => {
          const restored = await run(() =>
            noteState.createNote({ title: note.title, body: note.body, subjectId: note.subjectId, pinned: note.pinned })
          );
          if (restored) setSelectedNoteId(restored.id);
        },
      },
    });
  }

  async function deleteSubject(subject) {
    const related = tasks.filter((task) => task.subjectId === subject.id).length;
    const confirmed = await feedback.askConfirm({
      title: `Delete ${subject.name}?`,
      body: related > 0 ? `${related} task${related === 1 ? '' : 's'} will stay, without a subject.` : 'No tasks use this subject.',
      confirmLabel: 'Delete subject',
      danger: true,
    });
    if (!confirmed) return;
    const removed = await run(() => subjectState.removeSubject(subject.id), 'Subject deleted');
    if (removed === null) return;
    const unlink = (item) => (item.subjectId === subject.id ? { ...item, subjectId: null } : item);
    taskState.setTasks((current) => current.map(unlink));
    noteState.setNotes((current) => current.map(unlink));
  }

  function applySnapshot(snapshot) {
    taskState.setTasks(snapshot.tasks);
    subjectState.setSubjects(snapshot.subjects);
    noteState.setNotes(snapshot.notes || []);
    setSessions(snapshot.sessions);
    settingState.setSettings(snapshot.settings);
  }

  async function handleExport(kind) {
    const result = await run(() => (kind === 'json' ? desktopApi.data.exportJson() : desktopApi.data.exportCsv(kind)));
    if (result && !result.canceled) pushToast('Export saved', 'success');
  }

  async function handleImport() {
    const confirmed = await feedback.askConfirm({
      title: 'Replace all current data?',
      body: 'FocusDesk saves a copy of what you have now, then restores the file you choose. Tasks, subjects, notes, sessions, and settings are all replaced.',
      confirmLabel: 'Choose backup file',
      danger: true,
    });
    if (!confirmed) return;
    const result = await run(() => desktopApi.data.importJson());
    if (!result || result.canceled) return;
    applySnapshot(result.snapshot);
    pushToast('Backup restored', 'success');
  }

  async function resetPreferences() {
    const confirmed = await feedback.askConfirm({
      title: 'Reset preferences?',
      body: 'Theme, timer lengths, sounds, and notifications go back to their defaults. Your tasks, notes, and history are not touched.',
      confirmLabel: 'Reset',
    });
    if (confirmed) await run(() => settingState.resetPreferences(), 'Preferences reset');
  }

  const paletteActions = [
    { id: 'new-task', label: 'New task', icon: 'plus', shortcut: `${isMac ? '⌘' : 'Ctrl'} N`, keywords: 'create add', run: () => setTaskModal({ defaults: {} }) },
    { id: 'new-note', label: 'New note', icon: 'notes', keywords: 'create write', run: () => createNote() },
    {
      id: 'timer',
      label: timerStatus === 'running' ? 'Pause timer' : timerStatus === 'paused' ? 'Resume timer' : 'Start a focus block',
      icon: timerStatus === 'running' ? 'pause' : 'play',
      shortcut: 'Space',
      keywords: 'pomodoro focus start stop',
      run: () => (timerStatus === 'idle' ? actions.startFocus() : timer.toggle()),
    },
    { id: 'zen', label: 'Enter zen mode', icon: 'expand', keywords: 'fullscreen distraction', run: () => { navigate('focus'); setZen(true); } },
    { id: 'theme', label: `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`, icon: resolvedTheme === 'dark' ? 'sun' : 'moon', keywords: 'appearance mode', run: toggleTheme },
    { id: 'sidebar', label: settings.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar', icon: 'sidebar', shortcut: `${isMac ? '⌘' : 'Ctrl'} B`, run: toggleSidebar },
    { id: 'export', label: 'Export a backup', icon: 'download', keywords: 'save json data', run: () => handleExport('json') },
  ];

  const greeting = `${greetingFor(new Date())}${settings.studentName ? `, ${settings.studentName}` : ''}`;
  const goalTarget = settings.dailyGoalMinutes * 60;
  const editingTask = taskModal?.task ? tasks.find((task) => task.id === taskModal.task.id) || taskModal.task : null;

  return (
    <div className={`app-shell ${settings.sidebarCollapsed ? 'sidebar-collapsed' : ''} ${zen ? 'is-zen' : ''}`}>
      <div className="aurora" aria-hidden="true" />
      <Sidebar
        page={page}
        onNavigate={navigate}
        collapsed={settings.sidebarCollapsed}
        onToggle={toggleSidebar}
        badges={badges}
        timer={timer}
        streak={streak.current}
        goal={{ seconds: stats.studySecondsToday, targetSeconds: goalTarget, progress: Math.min(1, stats.studySecondsToday / goalTarget) }}
      />
      <div className="main-area">
        <TopBar
          page={page}
          greeting={greeting}
          dateLabel={formatLongDate(new Date())}
          isMac={isMac}
          isDark={resolvedTheme === 'dark'}
          onSearch={() => setCommandOpen(true)}
          onNewTask={() => setTaskModal({ defaults: {} })}
          onToggleTheme={toggleTheme}
        />
        <main className="page-scroll">
          <div className={`page page-${page}`} key={page}>
            {loadErrors.length > 0 ? (
              <section className="card banner">
                <Icon name="alert" size={18} />
                <div>
                  <strong>Some saved data could not be read</strong>
                  <p className="muted small">The damaged files were left untouched and backed up. You can start those sections fresh.</p>
                </div>
                <span className="spacer" />
                {loadErrors.map((error) => (
                  <button
                    key={error.name}
                    type="button"
                    className="btn btn-glass btn-sm"
                    onClick={async () => {
                      const snapshot = await run(() => desktopApi.recover(error.name), `Reset ${error.name}`);
                      if (!snapshot) return;
                      applySnapshot(snapshot);
                      setLoadErrors(snapshot.errors);
                    }}
                  >
                    Reset {error.name}
                  </button>
                ))}
              </section>
            ) : null}

            {page === 'dashboard' ? (
              <Dashboard tasks={tasks} subjects={subjects} sessions={sessions} settings={settings} stats={stats} streak={streak} focusByTask={focusByTask} timer={timer} actions={actions} />
            ) : null}
            {page === 'tasks' ? (
              <Tasks
                tasks={tasks}
                subjects={subjects}
                filters={taskState.filters}
                onFilterChange={taskState.setFilters}
                view={settings.taskView}
                onViewChange={(view) => updateSettings({ taskView: view }).catch(() => {})}
                focusByTask={focusByTask}
                actions={actions}
              />
            ) : null}
            {page === 'calendar' ? <Calendar tasks={tasks} subjects={subjects} sessions={sessions} focusByTask={focusByTask} actions={actions} /> : null}
            {page === 'focus' ? (
              <Focus
                tasks={tasks}
                subjects={subjects}
                sessions={sessions}
                settings={settings}
                timer={timer}
                zen={zen}
                onZenChange={setZen}
                onUpdateSettings={(patch) => updateSettings(patch).catch(() => {})}
                actions={actions}
              />
            ) : null}
            {page === 'notes' ? (
              <Notes
                notes={noteState.notes}
                subjects={subjects}
                selectedId={selectedNoteId}
                onSelect={setSelectedNoteId}
                onCreate={createNote}
                onSave={noteState.updateNote}
                onDelete={deleteNote}
              />
            ) : null}
            {page === 'subjects' ? (
              <Subjects
                subjects={subjects}
                tasks={tasks}
                sessions={sessions}
                onCreate={async (payload) => {
                  await subjectState.createSubject(payload);
                  pushToast('Subject added', 'success');
                }}
                onUpdate={async (id, payload) => {
                  await subjectState.updateSubject(id, payload);
                  pushToast('Subject updated', 'success');
                }}
                onDelete={deleteSubject}
                onShowTasks={(subject) => {
                  taskState.setFilters({ ...DEFAULT_FILTERS, subjectId: subject.id });
                  navigate('tasks');
                }}
              />
            ) : null}
            {page === 'statistics' ? <Statistics stats={stats} sessions={sessions} tasks={tasks} subjects={subjects} settings={settings} streak={streak} /> : null}
            {page === 'settings' ? (
              <Settings
                settings={settings}
                version={initial.version}
                userDataPath={initial.userDataPath}
                isMac={isMac}
                onUpdate={updateSettings}
                onResetPreferences={resetPreferences}
                onExportJson={() => handleExport('json')}
                onExportCsv={handleExport}
                onImport={handleImport}
                onTestSound={() => window.setTimeout(() => soundRef.current.play('check'), 60)}
              />
            ) : null}
          </div>
        </main>
      </div>

      {taskModal ? (
        <Modal
          key={editingTask?.id || 'new'}
          title={editingTask ? 'Edit task' : 'New task'}
          onClose={() => setTaskModal(null)}
          size="lg"
        >
          <TaskForm
            task={editingTask}
            defaults={taskModal.defaults}
            subjects={subjects}
            submitLabel={editingTask ? 'Save changes' : 'Create task'}
            onCancel={() => setTaskModal(null)}
            onDelete={editingTask ? () => deleteTask(editingTask) : undefined}
            onSubmit={async (payload) => {
              if (editingTask) {
                const wasOpen = editingTask.status !== 'completed';
                await taskState.updateTask(editingTask.id, payload);
                if (wasOpen && payload.status === 'completed') sound.play('check');
                pushToast('Task updated', 'success');
              } else {
                await taskState.createTask(payload);
                pushToast('Task added', 'success');
              }
              setTaskModal(null);
            }}
          />
        </Modal>
      ) : null}

      {commandOpen ? (
        <CommandPalette
          tasks={tasks}
          notes={noteState.notes}
          actions={paletteActions}
          isMac={isMac}
          onClose={() => setCommandOpen(false)}
          onNavigate={navigate}
          onOpenTask={(task) => setTaskModal({ task })}
          onOpenNote={(note) => {
            setSelectedNoteId(note.id);
            navigate('notes');
          }}
        />
      ) : null}

      {feedback.confirm ? (
        <ConfirmDialog
          title={feedback.confirm.title}
          body={feedback.confirm.body}
          confirmLabel={feedback.confirm.confirmLabel}
          danger={feedback.confirm.danger}
          onClose={() => feedback.confirm.resolve(false)}
          onConfirm={() => feedback.confirm.resolve(true)}
        />
      ) : null}

      <ToastStack toasts={feedback.toasts} onDismiss={feedback.dismissToast} />
    </div>
  );
}
