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
            {firstName} {lastName} ({lamId}) is closed and cannot be reopened.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason" className="font-medium">
            Reason for cancellation
          </Label>
          <Textarea
            id="cancel-reason"
            rows={3}
            placeholder="Client found financing elsewhere"
            value={cancelReason}
            onChange={(e) => onCancelReasonChange(e.target.value)}
            maxLength={2000}
            aria-required
            aria-describedby="cancel-reason-help"
          />
          <p id="cancel-reason-help" className="text-xs text-muted-foreground">
            Required. Recorded in the application history, 10 characters
            minimum.
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
            {cancelPending ? 'Cancelling…' : 'Cancel application'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}