import { useEffect, useRef } from 'react';
import { Icon } from './Icons.jsx';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusable(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (node) => !node.hasAttribute('disabled') && node.offsetParent !== null
  );
}

export function Modal({ title, subtitle, children, onClose, size = 'md', bare = false, labelledBy = 'modal-title' }) {
  const ref = useRef(null);
  // onClose is usually a new arrow function on every render of the parent. It is
  // read through a ref so the focus effect below runs exactly once per dialog.
  // Re-running it on each render used to yank focus out of whatever field the
  // user was typing in.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    // Start in the first field the user can type into, not on the close button.
    const target =
      node.querySelector('[data-autofocus]') ||
      node.querySelector('input:not([type="checkbox"]), textarea, select') ||
      getFocusable(node)[0] ||
      node;
    target.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable(node);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
  }, []);

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && closeRef.current()}>
      <div
        className={`modal modal-${size} ${bare ? 'modal-bare' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={bare ? undefined : labelledBy}
        aria-label={bare ? title : undefined}
        ref={ref}
        tabIndex={-1}
      >
        {bare ? null : (
          <div className="modal-head">
            <div>
              <h2 id={labelledBy}>{title}</h2>
              {subtitle ? <p className="muted small">{subtitle}</p> : null}
            </div>
            <button type="button" className="icon-btn" onClick={() => closeRef.current()} aria-label="Close dialog">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, body, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} size="sm" labelledBy="confirm-title">
      <p className="muted">{body}</p>
      <div className="modal-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm} data-autofocus>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
