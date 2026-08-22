import './Modal.css';

export default function ConfirmDialog({ state, onClose }) {
  if (!state) return null;
  const { message, danger = true, onConfirm } = state;

  function handleConfirm() {
    onConfirm();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{danger ? 'Are You Sure?' : 'Confirm'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
          <div className="form-actions">
            <button className={danger ? 'btn-confirm-danger' : 'btn-primary'} onClick={handleConfirm}>
              {danger ? 'Delete' : 'Confirm'}
            </button>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
