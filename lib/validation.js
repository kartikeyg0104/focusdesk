const { AppError } = require('./errors');
const { isId, createId } = require('./ids');
const { isValidIsoDate, toIso } = require('./date');
const { TASK_PRIORITIES, TASK_STATUSES, TIMER_PHASES } = require('./defaults');

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('INVALID_PAYLOAD', `${label} must be an object.`);
  }
  return value;
}

function cleanText(value, { required = false, max = 240, field = 'Value' } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new AppError('VALIDATION', `${field} is required.`);
    return '';
  }

  if (typeof value !== 'string') {
    throw new AppError('VALIDATION', `${field} must be text.`);
  }

  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new AppError('VALIDATION', `${field} cannot be empty.`);
  }
  if (trimmed.length > max) {
    throw new AppError('VALIDATION', `${field} must be ${max} characters or fewer.`);
  }
  return trimmed;
}

function optionalId(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (!isId(value)) throw new AppError('VALIDATION', `${field} is not valid.`);
  return value;
}

function optionalDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (!isValidIsoDate(value) && Number.isNaN(new Date(value).getTime())) {
    throw new AppError('VALIDATION', `${field} must be a valid date.`);
  }
  return toIso(value);
}

function optionalMinutes(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 24 * 60) {
    throw new AppError('VALIDATION', `${field} must be between 0 and 1440 minutes.`);
  }
  return Math.round(number);
}

function cleanSubtasks(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new AppError('VALIDATION', 'Subtasks must be a list.');
  if (value.length > 50) throw new AppError('VALIDATION', 'A task can have at most 50 subtasks.');
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') throw new AppError('VALIDATION', 'A subtask is not valid.');
      return {
        id: isId(item.id) ? item.id : createId(),
        title: cleanText(item.title, { max: 160, field: 'Subtask' }),
        done: Boolean(item.done),
      };
    })
    .filter((item) => item.title);
}

function cleanTags(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new AppError('VALIDATION', 'Tags must be a list.');
  const seen = new Set();
  const tags = [];
  value.forEach((tag) => {
    if (typeof tag !== 'string') throw new AppError('VALIDATION', 'Tags must be text.');
    const clean = tag.trim().replace(/^#+/, '').toLowerCase().slice(0, 24);
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    tags.push(clean);
  });
  return tags.slice(0, 8);
}

function validateTaskCreate(payload) {
  const data = requireObject(payload, 'Task');
  const title = cleanText(data.title, { required: true, max: 160, field: 'Title' });
  const description = cleanText(data.description, { max: 4000, field: 'Description' });
  const subjectId = optionalId(data.subjectId, 'Subject');
  const priority = data.priority || 'medium';
  const status = data.status || 'todo';

  if (!TASK_PRIORITIES.includes(priority)) {
    throw new AppError('VALIDATION', 'Priority must be low, medium, or high.');
  }
  if (!TASK_STATUSES.includes(status)) {
    throw new AppError('VALIDATION', 'Status must be todo, in progress, or completed.');
  }

  return {
    title,
    description,
    subjectId,
    priority,
    status,
    dueDate: optionalDate(data.dueDate, 'Due date'),
    estimatedMinutes: optionalMinutes(data.estimatedMinutes, 'Estimated duration'),
    subtasks: cleanSubtasks(data.subtasks),
    tags: cleanTags(data.tags),
  };
}

function validateTaskUpdate(payload) {
  const data = requireObject(payload, 'Task update');
  const next = {};

  if (data.title !== undefined) {
    next.title = cleanText(data.title, { required: true, max: 160, field: 'Title' });
  }
  if (data.description !== undefined) {
    next.description = cleanText(data.description, { max: 4000, field: 'Description' });
  }
  if (data.subjectId !== undefined) {
    next.subjectId = optionalId(data.subjectId, 'Subject');
  }
  if (data.priority !== undefined) {
    if (!TASK_PRIORITIES.includes(data.priority)) {
      throw new AppError('VALIDATION', 'Priority must be low, medium, or high.');
    }
    next.priority = data.priority;
  }
  if (data.status !== undefined) {
    if (!TASK_STATUSES.includes(data.status)) {
      throw new AppError('VALIDATION', 'Status must be todo, in progress, or completed.');
    }
    next.status = data.status;
  }
  if (data.dueDate !== undefined) {
    next.dueDate = optionalDate(data.dueDate, 'Due date');
  }
  if (data.estimatedMinutes !== undefined) {
    next.estimatedMinutes = optionalMinutes(data.estimatedMinutes, 'Estimated duration');
  }

  if (data.subtasks !== undefined) next.subtasks = cleanSubtasks(data.subtasks);
  if (data.tags !== undefined) next.tags = cleanTags(data.tags);

  if (Object.keys(next).length === 0) {
    throw new AppError('VALIDATION', 'No valid task fields were provided.');
  }

  return next;
}

function validateSubjectCreate(payload) {
  const data = requireObject(payload, 'Subject');
  const name = cleanText(data.name, { required: true, max: 80, field: 'Name' });
  const description = cleanText(data.description, { max: 400, field: 'Description' });
  const color = cleanText(data.color || '#8B7CFF', { required: true, max: 20, field: 'Color' });

  if (!/^#([0-9a-fA-F]{6})$/.test(color)) {
    throw new AppError('VALIDATION', 'Color must be a six-digit hex value.');
  }

  return { name, description, color };
}

function validateSubjectUpdate(payload) {
  const data = requireObject(payload, 'Subject update');
  const next = {};

  if (data.name !== undefined) {
    next.name = cleanText(data.name, { required: true, max: 80, field: 'Name' });
  }
  if (data.description !== undefined) {
    next.description = cleanText(data.description, { max: 400, field: 'Description' });
  }
  if (data.color !== undefined) {
    next.color = cleanText(data.color, { required: true, max: 20, field: 'Color' });
    if (!/^#([0-9a-fA-F]{6})$/.test(next.color)) {
      throw new AppError('VALIDATION', 'Color must be a six-digit hex value.');
    }
  }

  if (Object.keys(next).length === 0) {
    throw new AppError('VALIDATION', 'No valid subject fields were provided.');
  }

  return next;
}

function validateNoteCreate(payload) {
  const data = requireObject(payload, 'Note');
  return {
    title: cleanText(data.title, { max: 160, field: 'Title' }) || 'Untitled note',
    body: typeof data.body === 'string' ? data.body.slice(0, 50000) : '',
    subjectId: optionalId(data.subjectId, 'Subject'),
    pinned: Boolean(data.pinned),
  };
}

function validateNoteUpdate(payload) {
  const data = requireObject(payload, 'Note update');
  const next = {};
  if (data.title !== undefined) next.title = cleanText(data.title, { max: 160, field: 'Title' }) || 'Untitled note';
  if (data.body !== undefined) {
    if (typeof data.body !== 'string') throw new AppError('VALIDATION', 'Note text must be text.');
    if (data.body.length > 50000) throw new AppError('VALIDATION', 'Note is too long.');
    next.body = data.body;
  }
  if (data.subjectId !== undefined) next.subjectId = optionalId(data.subjectId, 'Subject');
  if (data.pinned !== undefined) next.pinned = Boolean(data.pinned);
  if (Object.keys(next).length === 0) {
    throw new AppError('VALIDATION', 'No valid note fields were provided.');
  }
  return next;
}

function validateSessionCreate(payload) {
  const data = requireObject(payload, 'Session');
  const phase = data.phase || 'focus';
  if (!TIMER_PHASES.includes(phase)) {
    throw new AppError('VALIDATION', 'Session phase is not valid.');
  }

  const startedAt = optionalDate(data.startedAt, 'Start time');
  const endedAt = optionalDate(data.endedAt, 'End time');
  if (!startedAt || !endedAt) {
    throw new AppError('VALIDATION', 'Sessions need a start and end time.');
  }

  const durationSeconds = Number(data.durationSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new AppError('VALIDATION', 'Duration must be a non-negative number of seconds.');
  }

  return {
    taskId: optionalId(data.taskId, 'Task'),
    subjectId: optionalId(data.subjectId, 'Subject'),
    phase,
    startedAt,
    endedAt,
    durationSeconds: Math.round(durationSeconds),
    completed: Boolean(data.completed),
    interrupted: Boolean(data.interrupted),
    interruptionReason: cleanText(data.interruptionReason, { max: 80, field: 'Interruption reason' }) || null,
    completionId: optionalId(data.completionId, 'Completion'),
  };
}

function applyTaskStatus(task, status, nowIso) {
  const next = { ...task, status, updatedAt: nowIso };
  if (status === 'completed') {
    next.completedAt = nowIso;
  } else if (task.status === 'completed') {
    next.completedAt = null;
  }
  return next;
}

function namesMatch(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

module.exports = {
  requireObject,
  cleanText,
  validateTaskCreate,
  validateTaskUpdate,
  validateSubjectCreate,
  validateSubjectUpdate,
  validateSessionCreate,
  validateNoteCreate,
  validateNoteUpdate,
  applyTaskStatus,
  namesMatch,
};
