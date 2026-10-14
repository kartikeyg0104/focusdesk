import { useCallback, useState } from 'react';
import { desktopApi } from '../services/desktopApi.js';

export function useSubjects(initial = []) {
  const [subjects, setSubjects] = useState(initial);

  const createSubject = useCallback(async (payload) => {
    const subject = await desktopApi.subjects.create(payload);
    setSubjects((current) => [...current, subject]);
    return subject;
  }, []);

  const updateSubject = useCallback(async (id, payload) => {
    const subject = await desktopApi.subjects.update(id, payload);
    setSubjects((current) => current.map((item) => (item.id === id ? subject : item)));
    return subject;
  }, []);

  const removeSubject = useCallback(async (id) => {
    await desktopApi.subjects.remove(id);
    setSubjects((current) => current.filter((item) => item.id !== id));
  }, []);

  return { subjects, setSubjects, createSubject, updateSubject, removeSubject };
}
