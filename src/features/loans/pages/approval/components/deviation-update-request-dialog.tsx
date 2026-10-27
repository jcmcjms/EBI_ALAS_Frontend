import { useRef, useState } from 'react'
import { ArrowCounterClockwise } from '@phosphor-icons/react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/shared/ui/feedback/dialog'
import { Button } from '@/src/shared/ui/primitives/button'
import { Label } from '@/src/shared/ui/primitives/label'
import { Textarea } from '@/src/shared/ui/primitives/textarea'
import { Spinner } from '@/src/shared/ui/feedback/spinner'

/** Mirrors the minimum the revision endpoint enforces on the comment. */
const MIN = 10
const MAX = 2000

interface DeviationUpdateRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (instructions: string) => void
  isPending: boolean
}

export function DeviationUpdateRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: DeviationUpdateRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {open && (
          <DeviationUpdateRequestForm
            onSubmit={onSubmit}
            isPending={isPending}
            onDismiss={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DeviationUpdateRequestForm({
  onSubmit,
  isPending,
  onDismiss,
}: {
  onSubmit: (instructions: string) => void
  isPending: boolean
  onDismiss: () => void
}) {
  const [instructions, setInstructions] = useState('')
  const [showError, setShowError] = useState(false)
  const fieldRef = useRef<HTMLTextAreaElement>(null)

  const tooShort = instructions.trim().length < MIN

  const handleSubmit = () => {
    if (tooShort) {
      setShowError(true)
      fieldRef.current?.focus()
      return
    }
    onSubmit(instructions.trim())
  }

  return (
    <>
      <div className="shrink-0 border-b px-6 pt-6 pb-4">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Ask the encoder to update deviations
          </DialogTitle>
          <DialogDescription>
            The application goes back to them for the deviations section.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="deviation-update-instructions" className="font-medium">
            What to change
          </Label>
          <Textarea
            id="deviation-update-instructions"
            ref={fieldRef}
            rows={5}
            value={instructions}
            disabled={isPending}
            maxLength={MAX}
            placeholder="CIBI deviation is missing; age deviation should be severe, not moderate"
            onChange={(e) => setInstructions(e.target.value)}
            onBlur={() => setShowError(true)}
            aria-required
            aria-invalid={Boolean(showError && tooShort)}
            aria-describedby="deviation-update-help"
          />
          <p
            id="deviation-update-help"
            className={
              showError && tooShort
                ? 'text-xs text-destructive'
                : 'text-xs text-muted-foreground'
            }
          >
            {showError && tooShort
              ? 'Name the deviation and what is wrong with it.'
              : `Sent with the notification. ${MIN} characters minimum.`}
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t px-6 py-4">
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDismiss} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" className="gap-2" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Spinner className="size-3.5" aria-hidden />}
            <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
            Send request
          </Button>
        </DialogFooter>
      </div>
    </>
  )
}
