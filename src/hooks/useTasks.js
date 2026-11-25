import { useCallback, useState } from 'react';
import { desktopApi } from '../services/desktopApi.js';

export const DEFAULT_FILTERS = {
  tab: 'open',
  query: '',
  priority: 'all',
  subjectId: 'all',
  sortBy: 'dueDate',
};

export function useTasks(initial = []) {
  const [tasks, setTasks] = useState(initial);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const createTask = useCallback(async (payload) => {
    const task = await desktopApi.tasks.create(payload);
    setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    return task;
  }, []);

  const updateTask = useCallback(async (id, payload) => {
    const task = await desktopApi.tasks.update(id, payload);
    setTasks((current) => current.map((item) => (item.id === id ? task : item)));
    return task;
  }, []);

  const removeTask = useCallback(async (id) => {
    await desktopApi.tasks.remove(id);
    setTasks((current) => current.filter((item) => item.id !== id));
  }, []);

  return { tasks, setTasks, filters, setFilters, createTask, updateTask, removeTask };
}
