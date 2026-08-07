import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3" role="alert">
          <div
            className={`rounded-full p-2 shrink-0 ${variant === 'danger' ? 'bg-destructive/10' : 'bg-amber-500/10'}`}
            aria-hidden="true"
          >
            <AlertTriangle
              className={`h-5 w-5 ${variant === 'danger' ? 'text-destructive' : 'text-amber-500'}`}
              aria-hidden="true"
            />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed" id="confirm-dialog-message">
            {message}
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            aria-label="Cancel and close dialog"
          >
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            aria-label={confirmLabel}
            aria-describedby="confirm-dialog-message"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
