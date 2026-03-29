type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onCancel,
  onConfirm,
  confirming = false,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-dialog-title">{title}</h3>
        <p>{body}</p>
        <div className="dialog-actions">
          <button className="secondary-btn" onClick={onCancel} disabled={confirming}>
            {cancelLabel}
          </button>
          <button className="danger-btn" onClick={onConfirm} disabled={confirming}>
            {confirming ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
