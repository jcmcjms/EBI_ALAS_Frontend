import { useState } from 'react'
import { WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react'

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

const MIN = 10

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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
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

  const canSubmit = instructions.trim().length >= MIN && !isPending

  return (
    <>
      <div className="shrink-0 border-b px-6 pb-4 pt-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ArrowCounterClockwise
              size={16}
              weight="bold"
              className="text-amber-500"
            />
            Request Deviation Update
          </DialogTitle>
          <DialogDescription>
            Ask the encoder to update existing deviations or add missing ones
            (with justifications). The application is returned for revision on
            the Deviations section only so they can edit the selection.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <div className="space-y-2">
          <Label htmlFor="deviation-update-instructions" className="text-xs font-semibold">
            Instructions <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="deviation-update-instructions"
            rows={5}
            value={instructions}
            disabled={isPending}
            maxLength={2000}
            placeholder="e.g. Add missing deviation for lacking CIBI; correct severity on Age not within prescribed parameters…"
            onChange={(e) => setInstructions(e.target.value)}
          />
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {instructions.trim().length > 0 && instructions.trim().length < MIN && (
              <p className="flex items-center gap-1">
                <WarningCircle size={12} weight="fill" /> Minimum {MIN} characters
              </p>
            )}
            <span className="ml-auto tabular-nums">
              {instructions.length}/2000
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t px-6 py-4">
        <DialogFooter>
          <Button variant="outline" onClick={onDismiss} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="gap-2"
            onClick={() => canSubmit && onSubmit(instructions.trim())}
            disabled={!canSubmit}
          >
            {isPending ? (
              <span className="animate-pulse">Sending…</span>
            ) : (
              'Send deviation request'
            )}
          </Button>
        </DialogFooter>
      </div>
    </>
  )
}
