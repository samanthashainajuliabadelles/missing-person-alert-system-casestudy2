import { AlertTriangle, X } from 'lucide-react';

const makeFriendlyMessage = message => {
  if (!message) {
    return 'Please confirm this action. Once completed, it cannot be undone.';
  }

  const lower = message.toLowerCase();

  if (
    lower.includes('neo4j') ||
    lower.includes('node') ||
    lower.includes('relationship') ||
    lower.includes('direct relationships')
  ) {
    return 'This will permanently delete this record and its related information from the system. This action cannot be undone.';
  }

  return message;
};

export default function ConfirmDialog({
  open,
  title = 'Please confirm',
  message = 'Please confirm this action. Once completed, it cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  onCancel,
  onConfirm
}) {
  if (!open) return null;

  const friendlyMessage = makeFriendlyMessage(message);

  return (
    <div
      className="modal-backdrop improved-modal-backdrop"
      role="presentation"
      onMouseDown={onCancel}
    >
      <div
        className={`modal-card improved-modal-card ${
          danger ? 'danger-modal' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="modal-icon-wrap">
          <div className="modal-icon">
            <AlertTriangle size={28} />
          </div>
        </div>

        <div className="modal-content">
          <p className="modal-kicker">
            {danger ? 'Important Confirmation' : 'Confirmation'}
          </p>

          <h3 id="confirm-dialog-title">{title}</h3>

          <p>{friendlyMessage}</p>
        </div>

        <div className="modal-actions improved-modal-actions">
          <button
            type="button"
            className="ghost-button modal-cancel-btn"
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={
              danger
                ? 'danger modal-confirm-btn'
                : 'primary modal-confirm-btn'
            }
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}