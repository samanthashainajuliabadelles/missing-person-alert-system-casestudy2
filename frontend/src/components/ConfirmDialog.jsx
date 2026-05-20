export default function ConfirmDialog({ open, title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="ghost-button" type="button" onClick={onCancel}>{cancelText}</button>
          <button className={danger ? 'danger' : 'primary'} type="button" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
