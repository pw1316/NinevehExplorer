interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, title, message, confirmLabel = '删除', onConfirm, onCancel }: ConfirmModalProps): JSX.Element | null {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="btn danger" onClick={onConfirm}>{confirmLabel}</button>
          <button className="btn" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  )
}
