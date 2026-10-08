function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  return parseDate(value) !== null;
}

function toIso(value = new Date()) {
  const date = parseDate(value);
  return date ? date.toISOString() : null;
}

function startOfDay(value = new Date()) {
  const date = parseDate(value);
  if (!date) return null;
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value = new Date()) {
  const date = parseDate(value);
  if (!date) return null;
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(value = new Date()) {
  const date = startOfDay(value);
  if (!date) return null;
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return date;
}

function endOfWeek(value = new Date()) {
  const start = startOfWeek(value);
  if (!start) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfMonth(value = new Date()) {
  const date = startOfDay(value);
  if (!date) return null;
  date.setDate(1);
  return date;
}

function endOfMonth(value = new Date()) {
  const date = startOfDay(value);
  if (!date) return null;
  date.setMonth(date.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
}

function isSameDay(left, right) {
  const a = startOfDay(left);
  const b = startOfDay(right);
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

function isBeforeDay(value, compareTo = new Date()) {
  const date = startOfDay(value);
  const compare = startOfDay(compareTo);
  if (!date || !compare) return false;
  return date.getTime() < compare.getTime();
}

function addDays(value, amount) {
  const date = parseDate(value);
  if (!date) return null;
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function eachDayOfInterval(start, end) {
  const from = startOfDay(start);
  const to = startOfDay(end);
  if (!from || !to || from.getTime() > to.getTime()) return [];

  const days = [];
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function formatDate(value, options = {}) {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(undefined, {
    weekday: options.weekday,
    month: options.month || 'short',
    day: options.day || 'numeric',
    year: options.year || 'numeric',
  }).format(date);
}

function formatLongDate(value) {
  return formatDate(value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateInput(value) {
  const date = parseDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function greetingFor(date = new Date()) {
  const hours = parseDate(date).getHours();
  if (hours < 12) return 'Good morning';
  if (hours < 17) return 'Good afternoon';
  return 'Good evening';
}

function inLocalRange(value, start, end) {
  const date = parseDate(value);
  if (!date || !start || !end) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

exports.parseDate = parseDate;
exports.isValidIsoDate = isValidIsoDate;
exports.toIso = toIso;
exports.startOfDay = startOfDay;
exports.endOfDay = endOfDay;
exports.startOfWeek = startOfWeek;
exports.endOfWeek = endOfWeek;
exports.startOfMonth = startOfMonth;
exports.endOfMonth = endOfMonth;
exports.isSameDay = isSameDay;
exports.isBeforeDay = isBeforeDay;
exports.addDays = addDays;
exports.eachDayOfInterval = eachDayOfInterval;
exports.formatDate = formatDate;
exports.formatLongDate = formatLongDate;
exports.formatDateInput = formatDateInput;
exports.greetingFor = greetingFor;
exports.inLocalRange = inLocalRange;
