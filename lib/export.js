const { AppError } = require('./errors');
const { DATA_VERSION } = require('./defaults');
const { validateTaskCreate, validateSubjectCreate, validateSessionCreate } = require('./validation');
const { normalizeSettings } = require('./settings');
const { isId } = require('./ids');

function csvEscape(value) {
  const text = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows, columns) {
  const header = columns.map((column) => csvEscape(column.label)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => csvEscape(row[column.key])).join(',')
  );
  return [header, ...body].join('\n');
}

function buildExportPayload({ tasks, subjects, sessions, settings, exportedAt }) {
  return {
    app: 'focusdesk',
    version: DATA_VERSION,
    exportedAt,
    tasks: tasks || [],
    subjects: subjects || [],
    sessions: sessions || [],
    settings: settings || {},
  };
}

function validateImportPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('INVALID_IMPORT', 'The backup file is not a valid FocusDesk export.');
  }

  if (payload.app && payload.app !== 'focusdesk') {
    throw new AppError('INVALID_IMPORT', 'This file was not created by FocusDesk.');
  }

  const tasks = Array.isArray(payload.tasks) ? payload.tasks : null;
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : null;
  const sessions = Array.isArray(payload.sessions) ? payload.sessions : null;

  if (!tasks || !subjects || !sessions) {
    throw new AppError('INVALID_IMPORT', 'The backup is missing tasks, subjects, or sessions.');
  }

  const subjectIds = new Set();
  const normalizedSubjects = subjects.map((subject, index) => {
    const fields = validateSubjectCreate(subject);
    const id = isId(subject.id) ? subject.id : null;
    if (!id) {
      throw new AppError('INVALID_IMPORT', `Subject ${index + 1} is missing an id.`);
    }
    subjectIds.add(id);
    return {
      ...subject,
      ...fields,
      id,
    };
  });

  const taskIds = new Set();
  const normalizedTasks = tasks.map((task, index) => {
    const fields = validateTaskCreate(task);
    const id = isId(task.id) ? task.id : null;
    if (!id) {
      throw new AppError('INVALID_IMPORT', `Task ${index + 1} is missing an id.`);
    }
    if (fields.subjectId && !subjectIds.has(fields.subjectId)) {
      fields.subjectId = null;
    }
    taskIds.add(id);
    return {
      ...task,
      ...fields,
      id,
    };
  });

  const normalizedSessions = sessions.map((session, index) => {
    const fields = validateSessionCreate(session);
    const id = isId(session.id) ? session.id : null;
    if (!id) {
      throw new AppError('INVALID_IMPORT', `Session ${index + 1} is missing an id.`);
    }
    if (fields.taskId && !taskIds.has(fields.taskId)) {
      fields.taskId = null;
    }
    if (fields.subjectId && !subjectIds.has(fields.subjectId)) {
      fields.subjectId = null;
    }
    return {
      ...session,
      ...fields,
      id,
    };
  });

  return {
    version: DATA_VERSION,
    tasks: normalizedTasks,
    subjects: normalizedSubjects,
    sessions: normalizedSessions,
    settings: normalizeSettings(payload.settings || {}),
  };
}

const TASK_CSV_COLUMNS = [
  { key: 'id', label: 'id' },
  { key: 'title', label: 'title' },
  { key: 'description', label: 'description' },
  { key: 'subjectId', label: 'subjectId' },
  { key: 'priority', label: 'priority' },
  { key: 'status', label: 'status' },
  { key: 'dueDate', label: 'dueDate' },
  { key: 'estimatedMinutes', label: 'estimatedMinutes' },
  { key: 'createdAt', label: 'createdAt' },
  { key: 'updatedAt', label: 'updatedAt' },
  { key: 'completedAt', label: 'completedAt' },
];

const SESSION_CSV_COLUMNS = [
  { key: 'id', label: 'id' },
  { key: 'taskId', label: 'taskId' },
  { key: 'subjectId', label: 'subjectId' },
  { key: 'phase', label: 'phase' },
  { key: 'startedAt', label: 'startedAt' },
  { key: 'endedAt', label: 'endedAt' },
  { key: 'durationSeconds', label: 'durationSeconds' },
  { key: 'completed', label: 'completed' },
  { key: 'interrupted', label: 'interrupted' },
  { key: 'interruptionReason', label: 'interruptionReason' },
];

module.exports = {
  csvEscape,
  toCsv,
  buildExportPayload,
  validateImportPayload,
  TASK_CSV_COLUMNS,
  SESSION_CSV_COLUMNS,
};
