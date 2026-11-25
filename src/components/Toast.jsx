import { Icon } from './Icons.jsx';

const TONE_ICON = { success: 'check', error: 'alert', info: 'sparkle' };

export function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone || 'info'}`}>
          <span className="toast-icon">
            <Icon name={TONE_ICON[toast.tone] || 'sparkle'} size={14} strokeWidth={2.4} />
          </span>
          <span className="toast-message">{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action.run();
                onDismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
          <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
            <Icon name="close" size={13} />
          </button>
          <span className="toast-timer" style={{ animationDuration: `${toast.duration}ms` }} />
        </div>
      ))}
    </div>
  );
}
