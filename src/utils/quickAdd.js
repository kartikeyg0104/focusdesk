// Turns one typed line into task fields, so adding a task never needs a form.
//   "Lab report fri !high #chem @math 45m"
// Anything that is not recognised stays in the title.

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const PRIORITY_WORDS = { high: 'high', hi: 'high', urgent: 'high', med: 'medium', medium: 'medium', low: 'low', lo: 'low' };

function atNoon(date) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function parseDateWord(word, now) {
  if (word === 'today' || word === 'tod') return now;
  if (word === 'tomorrow' || word === 'tmr' || word === 'tmrw') return addDays(now, 1);
  const index = WEEKDAYS.findIndex((day) => day === word || (word.length >= 3 && day.startsWith(word) && word.length <= 4));
  if (index === -1) return null;
  // The next occurrence of that weekday; naming today's weekday means a week from now.
  const delta = (index - now.getDay() + 7) % 7 || 7;
  return addDays(now, delta);
}

function matchSubject(needle, subjects) {
  const clean = needle.toLowerCase();
  const squash = (name) => name.toLowerCase().replace(/\s+/g, '');
  return (
    subjects.find((subject) => squash(subject.name) === clean) ||
    subjects.find((subject) => squash(subject.name).startsWith(clean)) ||
    subjects.find((subject) => subject.name.toLowerCase().split(/\s+/).some((part) => part.startsWith(clean))) ||
    null
  );
}

export function parseQuickAdd(input, { subjects = [], now = new Date() } = {}) {
  const words = String(input || '').trim().split(/\s+/).filter(Boolean);
  const result = { title: '', priority: 'medium', tags: [], subjectId: null, dueDate: null, estimatedMinutes: null };
  const hints = [];
  const kept = [];

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const lower = word.toLowerCase();

    if (/^!+$/.test(word)) {
      result.priority = word.length >= 2 ? 'high' : 'medium';
      hints.push({ kind: 'priority', label: `${result.priority} priority` });
      continue;
    }
    if (lower.startsWith('!') && PRIORITY_WORDS[lower.slice(1)]) {
      result.priority = PRIORITY_WORDS[lower.slice(1)];
      hints.push({ kind: 'priority', label: `${result.priority} priority` });
      continue;
    }
    if (/^#[\w-]+$/.test(word)) {
      const tag = lower.slice(1, 25);
      if (!result.tags.includes(tag)) result.tags.push(tag);
      hints.push({ kind: 'tag', label: `#${tag}` });
      continue;
    }
    if (/^@[\w-]+$/.test(word)) {
      const subject = matchSubject(word.slice(1), subjects);
      if (subject) {
        result.subjectId = subject.id;
        hints.push({ kind: 'subject', label: subject.name, color: subject.color });
        continue;
      }
    }
    const duration = lower.match(/^(\d+(?:\.\d+)?)(m|min|mins|h|hr|hrs)$/);
    if (duration) {
      const amount = Number(duration[1]);
      const minutes = Math.round(duration[2].startsWith('h') ? amount * 60 : amount);
      if (minutes > 0 && minutes <= 1440) {
        result.estimatedMinutes = minutes;
        hints.push({ kind: 'estimate', label: `${minutes} min` });
        continue;
      }
    }
    // "in 3 days" / "in 2 weeks"
    if (lower === 'in' && /^\d+$/.test(words[i + 1] || '') && /^(day|days|week|weeks)$/i.test(words[i + 2] || '')) {
      const amount = Number(words[i + 1]) * (/^week/i.test(words[i + 2]) ? 7 : 1);
      result.dueDate = atNoon(addDays(now, amount)).toISOString();
      hints.push({ kind: 'date', label: `in ${words[i + 1]} ${words[i + 2].toLowerCase()}` });
      i += 2;
      continue;
    }
    if (lower === 'next' && (words[i + 1] || '').toLowerCase() === 'week') {
      result.dueDate = atNoon(addDays(now, 7)).toISOString();
      hints.push({ kind: 'date', label: 'next week' });
      i += 1;
      continue;
    }
    const date = parseDateWord(lower, now);
    // A date word only counts once there is some title before it ("Friday review" keeps its title).
    if (date && kept.length > 0) {
      result.dueDate = atNoon(date).toISOString();
      hints.push({ kind: 'date', label: lower });
      continue;
    }
    kept.push(word);
  }

  result.title = kept.join(' ');
  return { ...result, hints };
}
