import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar.jsx';
import { Header } from './components/Header.jsx';
import { Modal } from './components/Modal.jsx';
import { TaskForm } from './components/TaskForm.jsx';
import { ConfirmDialog } from './components/ConfirmDialog.jsx';
import { ToastStack } from './components/Toast.jsx';
import { CommandPalette } from './components/CommandPalette.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Tasks } from './pages/Tasks.jsx';
import { Subjects } from './pages/Subjects.jsx';
import { Focus } from './pages/Focus.jsx';
import { Statistics } from './pages/Statistics.jsx';
import { Settings } from './pages/Settings.jsx';
import { useTasks } from './hooks/useTasks.js';
import { useSubjects } from './hooks/useSubjects.js';
import { useSettings } from './hooks/useSettings.js';
import { usePomodoro } from './hooks/usePomodoro.js';
import { useFeedback } from './hooks/useFeedback.js';
import { desktopApi } from './services/desktopApi.js';
import { formatLongDate } from './utils/date.js';
import { computeStatistics } from './utils/statistics.js';

export default function App() {
  const [boot, setBoot] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!desktopApi.available()) {
        setBoot({
          status: 'missing',
          message: 'FocusDesk needs the Electron shell. Run npm run dev from the project folder.',
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

  if (boot.status === 'loading') {
    return (
      <div className="page-scroll">
        <div className="panel boot-error">Loading FocusDesk…</div>
      </div>
    );
  }

  if (boot.status === 'missing' || boot.status === 'error') {
    return (
      <div className="page-scroll">
        <div className="panel boot-error">
          <h1>FocusDesk could not start</h1>
          <p className="muted" style={{ marginTop: 12 }}>
            {boot.message}
          </p>
        </div>
      </div>
    );
  }

  return <ReadyApp initial={boot.data} />;
}

function ReadyApp({ initial }) {
  const [page, setPage] = useState(initial.settings.startPage || 'dashboard');
  const [editingTask, setEditingTask] = useState(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [sessions, setSessions] = useState(initial.sessions);
  const [loadErrors, setLoadErrors] = useState(initial.errors || []);
  const [meta] = useState({ version: initial.version, userDataPath: initial.userDataPath });

  const feedback = useFeedback();
  const taskState = useTasks(initial.tasks);
  const subjectState = useSubjects(initial.subjects);
  const settingState = useSettings(initial.settings);

  const timer = usePomodoro({
    settings: settingState.settings,
    initialState: initial.settings.timerState,
    onSession: (session) => setSessions((current) => [session, ...current]),
    onNotify: (payload) => {
      desktopApi.notifications.session(payload).catch(() => {});
    },
    onError: (error) => feedback.pushToast(error.message, 'error'),
  });

  useEffect(() => {
    document.documentElement.dataset.theme = settingState.settings.theme || 'dark';
  }, [settingState.settings.theme]);

  useEffect(() => {
    const stopNav = desktopApi.onNavigate((nextPage) => setPage(nextPage));
    const stopCommand = desktopApi.onCommand((command) => {
      if (command === 'new-task') setCreatingTask(true);
      if (command === 'quick-search') setCommandOpen(true);
    });
    return () => {
      stopNav?.();
      stopCommand?.();
    };
  }, []);

  const isEditingField = useCallback(() => {
    const tag = document.activeElement?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
  }, []);

  const timerStatus = timer.state.status;
  const pauseTimer = timer.pause;
  const resumeTimer = timer.resume;

  useEffect(() => {
    function onKeyDown(event) {
      const metaKey = event.metaKey || event.ctrlKey;
      if (metaKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (metaKey && event.key.toLowerCase() === 'n') {
        if (isEditingField()) return;
        event.preventDefault();
        setCreatingTask(true);
      }
      if (metaKey && event.key === ',') {
        event.preventDefault();
        setPage('settings');
      }
      if (event.key === 'Escape') {
        setCreatingTask(false);
        setEditingTask(null);
        setCommandOpen(false);
      }
      if (event.code === 'Space' && !isEditingField() && !creatingTask && !editingTask && !commandOpen) {
        if (page !== 'focus' && timerStatus === 'idle') return;
        event.preventDefault();
        if (timerStatus === 'running') pauseTimer();
        else if (timerStatus === 'paused') resumeTimer();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandOpen, creatingTask, editingTask, isEditingField, page, pauseTimer, resumeTimer, timerStatus]);

  const stats = useMemo(
    () =>
      computeStatistics({
        tasks: taskState.tasks,
        sessions,
        subjects: subjectState.subjects,
      }),
    [sessions, subjectState.subjects, taskState.tasks]
  );

  async function handleCreate(payload) {
    const task = await taskState.createTask(payload);
    setCreatingTask(false);
    feedback.pushToast('Task created');
    return task;
  }

  async function handleUpdate(payload) {
    const task = await taskState.updateTask(editingTask.id, payload);
    setEditingTask(null);
    feedback.pushToast('Task updated');
    return task;
  }

  async function handleComplete(task) {
    try {
      await taskState.updateTask(task.id, { status: 'completed' });
      feedback.pushToast('Task completed');
    } catch (error) {
      feedback.pushToast(error.message, 'error');
    }
  }

  async function handleReopen(task) {
    try {
      await taskState.updateTask(task.id, { status: 'todo' });
      feedback.pushToast('Task reopened');
    } catch (error) {
      feedback.pushToast(error.message, 'error');
    }
  }

  async function handleDeleteTask(task) {
    const confirmed = await feedback.askConfirm({
      title: 'Delete this task?',
      body: 'The task will be removed. Completed history in statistics stays if sessions already exist.',
      confirmLabel: 'Delete task',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await taskState.removeTask(task.id);
      setEditingTask(null);
      feedback.pushToast('Task deleted');
    } catch (error) {
      feedback.pushToast(error.message, 'error');
    }
  }

  async function handleDeleteSubject(subject) {
    const related = taskState.tasks.filter((task) => task.subjectId === subject.id).length;
    const confirmed = await feedback.askConfirm({
      title: `Delete ${subject.name}?`,
      body:
        related > 0
          ? `${related} related tasks will stay, but they will become unassigned.`
          : 'This subject will be removed. Existing tasks are unchanged.',
      confirmLabel: 'Delete subject',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await subjectState.removeSubject(subject.id);
      taskState.setTasks((current) =>
        current.map((task) => (task.subjectId === subject.id ? { ...task, subjectId: null } : task))
      );
      feedback.pushToast('Subject deleted');
    } catch (error) {
      feedback.pushToast(error.message, 'error');
    }
  }

  async function startFocusFor(task) {
    setPage('focus');
    if (timer.state.status === 'idle') {
      await timer.start({ taskId: task.id, subjectId: task.subjectId || null });
    } else {
      await timer.setTask(task);
    }
    feedback.pushToast(`Focus set to ${task.title}`);
  }

  async function handleExport(kind) {
    try {
      const result = kind === 'json' ? await desktopApi.data.exportJson() : await desktopApi.data.exportCsv(kind);
      if (!result.canceled) feedback.pushToast('Export saved');
    } catch (error) {
      feedback.pushToast(error.message, 'error');
    }
  }

  async function handleImport() {
    const confirmed = await feedback.askConfirm({
      title: 'Replace current data?',
      body: 'FocusDesk will write a backup first, then restore the selected file. This replaces tasks, subjects, sessions, and settings.',
      confirmLabel: 'Choose backup file',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const result = await desktopApi.data.importJson();
      if (result.canceled) return;
      taskState.setTasks(result.snapshot.tasks);
      subjectState.setSubjects(result.snapshot.subjects);
      setSessions(result.snapshot.sessions);
      settingState.setSettings(result.snapshot.settings);
      feedback.pushToast('Backup restored. Restart FocusDesk if a timer was running in the backup.');
    } catch (error) {
      feedback.pushToast(error.message, 'error');
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onNavigate={setPage}
        studySeconds={stats.studySecondsToday}
        openTasks={stats.tasks.remaining}
        version={meta.version}
      />
      <div className="main-area">
        <Header
          page={page}
          dateLabel={formatLongDate(new Date())}
          onNewTask={() => setCreatingTask(true)}
          onSearch={() => setCommandOpen(true)}
        />
        <main className="page-scroll">
          {loadErrors.length > 0 ? (
            <section className="panel" style={{ marginBottom: 16 }}>
              <h2>Some data files could not be loaded</h2>
              <p className="muted">
                Damaged files were left in place. You can recover an empty file without overwriting the backup copy.
              </p>
              <div className="header-actions" style={{ marginTop: 12 }}>
                {loadErrors.map((error) => (
                  <button
                    key={error.name}
                    type="button"
                    className="btn btn-ghost"
                    onClick={async () => {
                      try {
                        const snapshot = await desktopApi.recover(error.name);
                        taskState.setTasks(snapshot.tasks);
                        subjectState.setSubjects(snapshot.subjects);
                        setSessions(snapshot.sessions);
                        settingState.setSettings(snapshot.settings);
                        setLoadErrors(snapshot.errors);
                        feedback.pushToast(`Recovered ${error.name}`);
                      } catch (recoverError) {
                        feedback.pushToast(recoverError.message, 'error');
                      }
                    }}
                  >
                    Recover {error.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {page === 'dashboard' ? (
            <Dashboard
              settings={settingState.settings}
              tasks={taskState.tasks}
              subjects={subjectState.subjects}
              stats={stats}
              timer={timer}
              onOpenTask={(task) => {
                setPage('tasks');
                setEditingTask(task);
              }}
              onComplete={handleComplete}
              onReopen={handleReopen}
              onFocus={startFocusFor}
              onNavigate={setPage}
              onCreateTask={handleCreate}
            />
          ) : null}
          {page === 'tasks' ? (
            <Tasks
              tasks={taskState.visible}
              subjects={subjectState.subjects}
              filters={taskState.filters}
              onFilterChange={taskState.setFilters}
              onOpen={setEditingTask}
              onComplete={handleComplete}
              onReopen={handleReopen}
              onFocus={startFocusFor}
              onNew={() => setCreatingTask(true)}
            />
          ) : null}
          {page === 'subjects' ? (
            <Subjects
              subjects={subjectState.subjects}
              tasks={taskState.tasks}
              sessions={sessions}
              onCreate={async (payload) => {
                await subjectState.createSubject(payload);
                feedback.pushToast('Subject added');
              }}
              onUpdate={async (id, payload) => {
                await subjectState.updateSubject(id, payload);
                feedback.pushToast('Subject updated');
              }}
              onDelete={handleDeleteSubject}
            />
          ) : null}
          {page === 'focus' ? (
            <Focus
              tasks={taskState.tasks}
              subjects={subjectState.subjects}
              sessions={sessions}
              timer={timer}
              onSelectTask={(task) => timer.setTask(task)}
            />
          ) : null}
          {page === 'statistics' ? (
            <Statistics
              stats={stats}
              sessions={sessions}
              tasks={taskState.tasks}
              subjects={subjectState.subjects}
            />
          ) : null}
          {page === 'settings' ? (
            <Settings
              settings={settingState.settings}
              version={meta.version}
              userDataPath={meta.userDataPath}
              onUpdate={async (patch) => {
                try {
                  await settingState.updateSettings(patch);
                } catch (error) {
                  feedback.pushToast(error.message, 'error');
                  throw error;
                }
              }}
              onResetPreferences={async () => {
                const confirmed = await feedback.askConfirm({
                  title: 'Reset preferences?',
                  body: 'Theme, timer lengths, and notification defaults will reset. Tasks and history are not deleted.',
                  confirmLabel: 'Reset preferences',
                });
                if (!confirmed) return;
                try {
                  await settingState.resetPreferences();
                  feedback.pushToast('Preferences reset');
                } catch (error) {
                  feedback.pushToast(error.message, 'error');
                }
              }}
              onExportJson={() => handleExport('json')}
              onExportCsv={handleExport}
              onImport={handleImport}
            />
          ) : null}
        </main>
      </div>

      {creatingTask ? (
        <Modal title="New task" onClose={() => setCreatingTask(false)}>
          <TaskForm
            subjects={subjectState.subjects}
            submitLabel="Create task"
            onSubmit={handleCreate}
            onCancel={() => setCreatingTask(false)}
          />
        </Modal>
      ) : null}

      {editingTask ? (
        <Modal title="Edit task" onClose={() => setEditingTask(null)}>
          <TaskForm
            task={editingTask}
            subjects={subjectState.subjects}
            submitLabel="Save changes"
            onSubmit={handleUpdate}
            onCancel={() => setEditingTask(null)}
            onDelete={() => handleDeleteTask(editingTask)}
          />
        </Modal>
      ) : null}

      {commandOpen ? (
        <CommandPalette
          tasks={taskState.tasks}
          onClose={() => setCommandOpen(false)}
          onNavigate={setPage}
          onOpenTask={setEditingTask}
          onNewTask={() => setCreatingTask(true)}
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
