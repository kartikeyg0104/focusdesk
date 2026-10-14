import { useCallback, useState } from 'react';
import { desktopApi } from '../services/desktopApi.js';

export function useSettings(initial) {
  const [settings, setSettings] = useState(initial);

  const updateSettings = useCallback(async (patch) => {
    const next = await desktopApi.settings.update(patch);
    setSettings(next);
    return next;
  }, []);

  const resetPreferences = useCallback(async () => {
    const next = await desktopApi.settings.resetPreferences();
    setSettings(next);
    return next;
  }, []);

  return { settings, setSettings, updateSettings, resetPreferences };
}
