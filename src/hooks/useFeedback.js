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

  const pushToast = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, tone }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
    timers.current.add(timer);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
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
