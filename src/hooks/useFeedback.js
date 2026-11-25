import { useCallback, useEffect, useRef, useState } from 'react';

export function useFeedback() {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const timers = useRef(new Set());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // options.action = { label, run } adds a button (used for Undo).
  const pushToast = useCallback((message, tone = 'info', options = {}) => {
    const id = `${Date.now()}-${Math.random()}`;
    const duration = options.action ? 7000 : 3800;
    setToasts((current) => [...current.slice(-3), { id, message, tone, action: options.action || null, duration }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, duration);
    timers.current.add(timer);
    return id;
  }, []);

  const askConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirm({
        ...options,
        resolve: (value) => {
          setConfirm(null);
          resolve(value);
        },
      });
    });
  }, []);

  return { toasts, pushToast, dismissToast, confirm, askConfirm };
}
