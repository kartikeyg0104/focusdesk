const { createId } = require('../../lib/ids');
const { toIso } = require('../../lib/date');
const { AppError } = require('../../lib/errors');
const { DEFAULT_SUBJECTS, emptyCollection } = require('../../lib/defaults');
const {
  validateTaskCreate,
  validateTaskUpdate,
  validateSubjectCreate,
  validateSubjectUpdate,
  validateSessionCreate,
  applyTaskStatus,
  namesMatch,
} = require('../../lib/validation');
const { settingsDocument, normalizeSettings, validateSettingsPatch, normalizeTimerState } = require('../../lib/settings');
const { restoreTimerState } = require('../../lib/pomodoro');
const { computeStatistics } = require('../../lib/statistics');
const { buildExportPayload, validateImportPayload, toCsv, TASK_CSV_COLUMNS, SESSION_CSV_COLUMNS } = require('../../lib/export');

const SESSION_LIMIT = 2000;

class FocusDeskStore {
  constructor(jsonStore, { now = () => new Date() } = {}) {
    this.storage = jsonStore;
    this.now = now;
    this.cache = {
      tasks: null,
      subjects: null,
      sessions: null,
      settings: null,
    };
    this.ready = false;
    this.loadErrors = [];
  }

  async initialize() {
    this.loadErrors = [];
    this.cache.subjects = await this.loadCollection('subjects', { seedDefaults: true });
    this.cache.tasks = await this.loadCollection('tasks');
    this.cache.sessions = await this.loadCollection('sessions');
    this.cache.settings = await this.loadSettings();
    this.ready = this.loadErrors.length === 0;
    return this.snapshot();
  }

  snapshot() {
    return {
      ready: this.ready,
      errors: this.loadErrors,
      tasks: this.cache.tasks ? this.cache.tasks.items : [],
      subjects: this.cache.subjects ? this.cache.subjects.items : [],
      sessions: this.cache.sessions ? this.cache.sessions.items : [],
      settings: this.cache.settings ? this.cache.settings.data : normalizeSettings({}),
    };
  }

  async loadCollection(name, { seedDefaults = false } = {}) {
    try {
      const fallback = emptyCollection();
      if (seedDefaults) {
        fallback.items = DEFAULT_SUBJECTS.map((subject) => this.createSubjectRecord(subject));
      }
      const { data, created } = await this.storage.load(name, fallback);
      if (!data || !Array.isArray(data.items)) {
        throw new AppError('MALFORMED_DATA', `${name} data is missing a valid items list.`, { name });
      }
      if (created) return data;
      return { version: 1, items: data.items };
    } catch (error) {
      this.loadErrors.push({
        name,
        code: error.code || 'STORAGE_READ',
        message: error.message,
        details: error.details || null,
      });
      return emptyCollection();
    }
  }

  async loadSettings() {
    try {
      const fallback = settingsDocument();
      const { data } = await this.storage.load('settings', fallback);
      const document = settingsDocument(data);
      if (document.data.timerState) {
        document.data.timerState = restoreTimerState(document.data.timerState, this.now());
        await this.storage.save('settings', document);
      }
      return document;
    } catch (error) {
      this.loadErrors.push({
        name: 'settings',
        code: error.code || 'STORAGE_READ',
        message: error.message,
        details: error.details || null,
      });
      return settingsDocument();
    }
  }

  requireReady(name) {
    const blocked = this.loadErrors.find((error) => error.name === name);
    if (blocked) {
      throw new AppError(
        blocked.code,
        `${name} data could not be loaded safely. ${blocked.message}`,
        blocked.details
      );
    }
  }

  createSubjectRecord(fields, nowIso = toIso(this.now())) {
    return {
      id: createId(),
      name: fields.name,
      color: fields.color,
      description: fields.description || '',
      createdAt: nowIso,
    };
  }

  async persistCollection(name) {
    this.requireReady(name);
    await this.storage.save(name, this.cache[name]);
    return this.cache[name].items;
  }

  async commitCollection(name, nextItems) {
    this.requireReady(name);
    const previous = this.cache[name].items;
    this.cache[name].items = nextItems;
    try {
      await this.persistCollection(name);
      return this.cache[name].items;
    } catch (error) {
      this.cache[name].items = previous;
      throw error;
    }
  }

  listTasks() {
    this.requireReady('tasks');
    return this.cache.tasks.items;
  }

  async createTask(payload) {
    this.requireReady('tasks');
    this.requireReady('subjects');
    const fields = validateTaskCreate(payload);
    this.assertSubjectExists(fields.subjectId);
    const nowIso = toIso(this.now());
    const task = {
      id: createId(),
      ...fields,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: fields.status === 'completed' ? nowIso : null,
    };
    await this.commitCollection('tasks', [task, ...this.cache.tasks.items]);
    return task;
  }

  async updateTask(id, payload) {
    this.requireReady('tasks');
    const index = this.cache.tasks.items.findIndex((task) => task.id === id);
    if (index === -1) throw new AppError('NOT_FOUND', 'That task no longer exists.');
    const fields = validateTaskUpdate(payload);
    if (fields.subjectId !== undefined) {
      this.requireReady('subjects');
      this.assertSubjectExists(fields.subjectId);
    }

    const current = this.cache.tasks.items[index];
    const nowIso = toIso(this.now());
    let next = { ...current, ...fields, updatedAt: nowIso };
    if (fields.status) {
      const statused = applyTaskStatus(current, fields.status, nowIso);
      next = {
        ...statused,
        ...fields,
        status: statused.status,
        completedAt: statused.completedAt,
        updatedAt: nowIso,
      };
    }
    const items = this.cache.tasks.items.slice();
    items[index] = next;
    await this.commitCollection('tasks', items);
    return next;
  }

  async removeTask(id) {
    this.requireReady('tasks');
    const exists = this.cache.tasks.items.some((task) => task.id === id);
    if (!exists) throw new AppError('NOT_FOUND', 'That task no longer exists.');
    await this.commitCollection(
      'tasks',
      this.cache.tasks.items.filter((task) => task.id !== id)
    );
    return { id };
  }

  listSubjects() {
    this.requireReady('subjects');
    return this.cache.subjects.items;
  }

  assertSubjectExists(subjectId) {
    if (!subjectId) return;
    const found = this.cache.subjects.items.some((subject) => subject.id === subjectId);
    if (!found) throw new AppError('VALIDATION', 'The selected subject does not exist.');
  }

  async createSubject(payload) {
    this.requireReady('subjects');
    const fields = validateSubjectCreate(payload);
    if (this.cache.subjects.items.some((subject) => namesMatch(subject.name, fields.name))) {
      throw new AppError('DUPLICATE', 'A subject with that name already exists.');
    }
    const subject = this.createSubjectRecord(fields);
    await this.commitCollection('subjects', [...this.cache.subjects.items, subject]);
    return subject;
  }

  async updateSubject(id, payload) {
    this.requireReady('subjects');
    const index = this.cache.subjects.items.findIndex((subject) => subject.id === id);
    if (index === -1) throw new AppError('NOT_FOUND', 'That subject no longer exists.');
    const fields = validateSubjectUpdate(payload);
    if (
      fields.name &&
      this.cache.subjects.items.some((subject) => subject.id !== id && namesMatch(subject.name, fields.name))
    ) {
      throw new AppError('DUPLICATE', 'A subject with that name already exists.');
    }
    const next = { ...this.cache.subjects.items[index], ...fields };
    const items = this.cache.subjects.items.slice();
    items[index] = next;
    await this.commitCollection('subjects', items);
    return next;
  }

  async removeSubject(id) {
    this.requireReady('subjects');
    this.requireReady('tasks');
    const exists = this.cache.subjects.items.some((subject) => subject.id === id);
    if (!exists) throw new AppError('NOT_FOUND', 'That subject no longer exists.');

    const previousSubjects = this.cache.subjects.items;
    const previousTasks = this.cache.tasks.items;
    this.cache.subjects.items = previousSubjects.filter((subject) => subject.id !== id);
    this.cache.tasks.items = previousTasks.map((task) =>
      task.subjectId === id ? { ...task, subjectId: null, updatedAt: toIso(this.now()) } : task
    );
    try {
      await this.persistCollection('subjects');
      await this.persistCollection('tasks');
    } catch (error) {
      this.cache.subjects.items = previousSubjects;
      this.cache.tasks.items = previousTasks;
      throw error;
    }
    return {
      id,
      unassignedTaskIds: this.cache.tasks.items.filter((task) => task.subjectId === null && previousTasks.find((item) => item.id === task.id)?.subjectId === id).map((task) => task.id),
    };
  }

  listSessions() {
    this.requireReady('sessions');
    return this.cache.sessions.items;
  }

  async createSession(payload) {
    this.requireReady('sessions');
    const fields = validateSessionCreate(payload);
    if (fields.taskId) {
      this.requireReady('tasks');
      const task = this.cache.tasks.items.find((item) => item.id === fields.taskId);
      if (!task) fields.taskId = null;
      if (!fields.subjectId && task) fields.subjectId = task.subjectId;
    }
    if (fields.subjectId) {
      try {
        this.assertSubjectExists(fields.subjectId);
      } catch (_error) {
        fields.subjectId = null;
      }
    }

    if (fields.completionId) {
      const existing = this.cache.sessions.items.find((item) => item.completionId === fields.completionId);
      if (existing) return existing;
    }

    const session = {
      id: createId(),
      ...fields,
    };

    await this.commitCollection('sessions', [session, ...this.cache.sessions.items].slice(0, SESSION_LIMIT));
    return session;
  }

  getSettings() {
    this.requireReady('settings');
    return this.cache.settings.data;
  }

  async updateSettings(patch, { replacePreferences = false } = {}) {
    this.requireReady('settings');
    const previous = this.cache.settings.data;
    if (replacePreferences) {
      const preserved = {
        notifiedDeadlineKeys: previous.notifiedDeadlineKeys,
        notifiedDailyGoalDates: previous.notifiedDailyGoalDates,
        timerState: previous.timerState,
        studentName: patch.studentName ?? previous.studentName,
      };
      this.cache.settings.data = normalizeSettings({ ...preserved, ...patch });
    } else {
      validateSettingsPatch(patch);
      this.cache.settings.data = normalizeSettings({ ...previous, ...patch });
    }
    try {
      await this.storage.save('settings', this.cache.settings);
    } catch (error) {
      this.cache.settings.data = previous;
      throw error;
    }
    return this.cache.settings.data;
  }

  async saveTimerState(timerState) {
    this.requireReady('settings');
    if (timerState !== null && timerState !== undefined && (typeof timerState !== 'object' || Array.isArray(timerState))) {
      throw new AppError('VALIDATION', 'Timer state is not valid.');
    }
    const previous = this.cache.settings.data.timerState;
    this.cache.settings.data.timerState = normalizeTimerState(timerState);
    try {
      await this.storage.save('settings', this.cache.settings);
    } catch (error) {
      this.cache.settings.data.timerState = previous;
      throw error;
    }
    return this.cache.settings.data.timerState;
  }

  statistics() {
    this.requireReady('tasks');
    this.requireReady('sessions');
    this.requireReady('subjects');
    return computeStatistics({
      tasks: this.cache.tasks.items,
      sessions: this.cache.sessions.items,
      subjects: this.cache.subjects.items,
      now: this.now(),
    });
  }

  exportData() {
    return buildExportPayload({
      tasks: this.cache.tasks?.items || [],
      subjects: this.cache.subjects?.items || [],
      sessions: this.cache.sessions?.items || [],
      settings: this.cache.settings?.data || normalizeSettings({}),
      exportedAt: toIso(this.now()),
    });
  }

  exportTasksCsv() {
    return toCsv(this.listTasks(), TASK_CSV_COLUMNS);
  }

  exportSessionsCsv() {
    return toCsv(this.listSessions(), SESSION_CSV_COLUMNS);
  }

  async restoreFromBackup(payload) {
    const imported = validateImportPayload(payload);
    const backup = this.exportData();
    const previous = {
      tasks: this.cache.tasks,
      subjects: this.cache.subjects,
      sessions: this.cache.sessions,
      settings: this.cache.settings,
    };

    this.cache.tasks = { version: 1, items: imported.tasks };
    this.cache.subjects = { version: 1, items: imported.subjects };
    this.cache.sessions = { version: 1, items: imported.sessions };
    this.cache.settings = settingsDocument(imported.settings);

    try {
      await this.storage.save('tasks', this.cache.tasks);
      await this.storage.save('subjects', this.cache.subjects);
      await this.storage.save('sessions', this.cache.sessions);
      await this.storage.save('settings', this.cache.settings);
    } catch (error) {
      this.cache.tasks = previous.tasks;
      this.cache.subjects = previous.subjects;
      this.cache.sessions = previous.sessions;
      this.cache.settings = previous.settings;
      try {
        await this.storage.save('tasks', previous.tasks);
        await this.storage.save('subjects', previous.subjects);
        await this.storage.save('sessions', previous.sessions);
        await this.storage.save('settings', previous.settings);
      } catch (_rollbackError) {
        // Keep the original error; rollback to disk is best-effort.
      }
      throw error;
    }

    this.loadErrors = [];
    this.ready = true;
    return { restored: true, backup };
  }

  async recoverCollection(name) {
    const allowed = ['tasks', 'subjects', 'sessions', 'settings'];
    if (!allowed.includes(name)) {
      throw new AppError('VALIDATION', 'Unknown data file.');
    }

    const previous = name === 'settings' ? this.cache.settings : this.cache[name];
    const previousErrors = this.loadErrors.slice();
    const previousReady = this.ready;

    try {
      if (name === 'settings') {
        this.cache.settings = settingsDocument();
        await this.storage.save('settings', this.cache.settings);
      } else {
        const fallback = emptyCollection();
        if (name === 'subjects') {
          fallback.items = DEFAULT_SUBJECTS.map((subject) => this.createSubjectRecord(subject));
        }
        this.cache[name] = fallback;
        await this.storage.save(name, fallback);
      }
    } catch (error) {
      if (name === 'settings') this.cache.settings = previous;
      else this.cache[name] = previous;
      this.loadErrors = previousErrors;
      this.ready = previousReady;
      throw error;
    }

    this.loadErrors = this.loadErrors.filter((error) => error.name !== name);
    this.ready = this.loadErrors.length === 0;
    return this.snapshot();
  }
}

module.exports = { FocusDeskStore, SESSION_LIMIT };
