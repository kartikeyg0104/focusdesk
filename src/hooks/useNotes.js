import { useCallback, useState } from 'react';
import { desktopApi } from '../services/desktopApi.js';

export function useNotes(initial = []) {
  const [notes, setNotes] = useState(initial);

  const createNote = useCallback(async (payload = {}) => {
    const note = await desktopApi.notes.create(payload);
    setNotes((current) => [note, ...current]);
    return note;
  }, []);

  const updateNote = useCallback(async (id, payload) => {
    const note = await desktopApi.notes.update(id, payload);
    setNotes((current) => current.map((item) => (item.id === id ? note : item)));
    return note;
  }, []);

  const removeNote = useCallback(async (id) => {
    await desktopApi.notes.remove(id);
    setNotes((current) => current.filter((item) => item.id !== id));
  }, []);

  return { notes, setNotes, createNote, updateNote, removeNote };
}
