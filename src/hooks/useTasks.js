import { useCallback, useMemo, useState } from 'react';
import { desktopApi } from '../services/desktopApi.js';
import { queryTasks } from '../utils/taskFilters.js';

export function useTasks(initial = []) {
  const [tasks, setTasks] = useState(initial);
  const [filters, setFilters] = useState({
    query: '',
    status: 'all',
    priority: 'all',
    subjectId: 'all',
    due: 'all',
    sortBy: 'dueDate',
  });

  const visible = useMemo(() => queryTasks(tasks, filters), [tasks, filters]);

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

  return { tasks, setTasks, visible, filters, setFilters, createTask, updateTask, removeTask };
}
