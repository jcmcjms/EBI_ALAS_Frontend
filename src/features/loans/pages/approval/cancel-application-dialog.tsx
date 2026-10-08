import { Label } from '@/src/shared/ui/primitives/label'
import { Textarea } from '@/src/shared/ui/primitives/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/shared/ui/feedback/alert-dialog'

interface CancelApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cancelReason: string
  onCancelReasonChange: (reason: string) => void
  cancelPending: boolean
  onCancel: () => void
  firstName: string
  lastName: string
  lamId: string
}

export function CancelApplicationDialog({
  open,
  onOpenChange,
  cancelReason,
  onCancelReasonChange,
  cancelPending,
  onCancel,
  firstName,
  lastName,
  lamId,
}: CancelApplicationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this application?</AlertDialogTitle>
          <AlertDialogDescription>
            The client has withdrawn their application for{' '}
            <strong>
              {firstName} {lastName}
            </strong>{' '}
            (<code>{lamId}</code>). The application will be closed and
            the reviewer currently handling it will be notified. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Reason for cancellation *</Label>
          <Textarea
            id="cancel-reason"
            rows={3}
            placeholder="e.g. Client found financing elsewhere\u2026"
            value={cancelReason}
            onChange={(e) => onCancelReasonChange(e.target.value)}
            maxLength={2000}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {cancelReason.trim().length}/2000 — minimum 10
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              onOpenChange(false)
              onCancelReasonChange('')
            }}
          >
            Keep application
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={cancelPending || cancelReason.trim().length < 10}
            onClick={onCancel}
          >
            {cancelPending ? 'Cancelling\u2026' : 'Cancel application'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}