import { Alert } from './Alert'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger' | 'warning'
  loading?: boolean
  layer?: 'default' | 'top'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  loading,
  layer = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmVariant =
    tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'primary'

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={tone === 'warning' ? undefined : description}
      layer={layer}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {tone === 'warning' ? (
        <Alert tone="warning">{description}</Alert>
      ) : null}
    </Modal>
  )
}
