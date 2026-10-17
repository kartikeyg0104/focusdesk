import { useId } from 'react';
import { Modal } from './Modal.jsx';

export function ConfirmDialog({ title, body, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
  const titleId = useId();
  return (
    <Modal title={title} onClose={onClose} labelledBy={titleId}>
      <p className="muted">{body}</p>
      <div className="header-actions confirm-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
