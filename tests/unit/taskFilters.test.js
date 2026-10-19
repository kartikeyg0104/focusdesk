import { describe, expect, it } from 'vitest';
import { filterTasks, sortTasks, queryTasks } from '../../lib/taskFilters.js';

const now = new Date('2026-03-10T12:00:00');

const tasks = [
  {
    id: '1',
    title: 'Calc homework',
    description: 'Chapter 4',
    status: 'todo',
    priority: 'high',
    subjectId: 'math',
    dueDate: '2026-03-10T12:00:00.000Z',
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: '2',
    title: 'Essay outline',
    description: '',
    status: 'completed',
    priority: 'low',
    subjectId: 'write',
    dueDate: '2026-03-08T12:00:00.000Z',
    createdAt: '2026-03-02T00:00:00.000Z',
  },
  {
    id: '3',
    title: 'Unscheduled reading',
    description: 'Optional',
    status: 'in_progress',
    priority: 'medium',
    subjectId: null,
    dueDate: null,
    createdAt: '2026-03-03T00:00:00.000Z',
  },
];

describe('task filters and sorting', () => {
  it('filters by search, status, and subject', () => {
    expect(filterTasks(tasks, { query: 'calc' }, now)).toHaveLength(1);
    expect(filterTasks(tasks, { status: 'completed' }, now).map((task) => task.id)).toEqual(['2']);
    expect(filterTasks(tasks, { subjectId: 'unassigned' }, now).map((task) => task.id)).toEqual(['3']);
  });

  it('filters overdue and today', () => {
    expect(filterTasks(tasks, { due: 'overdue' }, now).map((task) => task.id)).toEqual([]);
    expect(filterTasks(tasks, { due: 'today' }, now).map((task) => task.id)).toEqual(['1']);
    expect(filterTasks(tasks, { due: 'none' }, now).map((task) => task.id)).toEqual(['3']);
  });

  it('sorts by priority and title', () => {
    expect(sortTasks(tasks, 'priority').map((task) => task.id)).toEqual(['1', '3', '2']);
    expect(sortTasks(tasks, 'title')[0].title).toBe('Calc homework');
  });

  it('combines filter and sort', () => {
    const result = queryTasks(tasks, { status: 'todo', sortBy: 'title' }, now);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});
