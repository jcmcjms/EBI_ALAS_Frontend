import { useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise } from '@phosphor-icons/react'

import { cn } from '@/src/shared/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/shared/ui/feedback/dialog'
import { Button } from '@/src/shared/ui/primitives/button'
import { Checkbox } from '@/src/shared/ui/primitives/checkbox'
import { Label } from '@/src/shared/ui/primitives/label'
import { Textarea } from '@/src/shared/ui/primitives/textarea'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import {
  SECTIONS,
  type SectionDef,
} from '@/src/features/loans/constants/sections'
import type {
  CreateRevisionRequestPayload,
  RevisionSectionId,
} from '../types/revision-request'

/** Mirrors the minimum the revision endpoint enforces on the comment. */
const MIN_INSTRUCTIONS = 10
const MAX_INSTRUCTIONS = 2000

const PICKER_SECTIONS = SECTIONS.filter(
  (s): s is SectionDef & { id: RevisionSectionId } => s.id !== 'approval-form',
)
const EDITABLE = PICKER_SECTIONS.filter((s) => !s.systemSourced)
const READ_ONLY = PICKER_SECTIONS.filter((s) => s.systemSourced)

interface PushbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: CreateRevisionRequestPayload) => void
  isPending: boolean
}

export function PushbackDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: PushbackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {open && (
          <PushbackDialogForm
            onSubmit={onSubmit}
            isPending={isPending}
            onDismiss={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PushbackDialogForm({
  onSubmit,
  isPending,
  onDismiss,
}: {
  onSubmit: (payload: CreateRevisionRequestPayload) => void
  isPending: boolean
  onDismiss: () => void
}) {
  const [instructions, setInstructions] = useState('')
  const [selected, setSelected] = useState<
    Partial<Record<RevisionSectionId, boolean>>
  >({})
  const [sectionComments, setSectionComments] = useState<
    Partial<Record<RevisionSectionId, string>>
  >({})
  const [showError, setShowError] = useState(false)
  const instructionsRef = useRef<HTMLTextAreaElement>(null)

  const selectedSections = useMemo(
    () => EDITABLE.filter((s) => selected[s.id]),
    [selected],
  )

  const tooShort = instructions.trim().length < MIN_INSTRUCTIONS

  const handleSubmit = () => {
    if (tooShort) {
      setShowError(true)
      instructionsRef.current?.focus()
      return
    }
    onSubmit({
      sections: selectedSections.map((s) => ({
        sectionId: s.id,
        comments: (sectionComments[s.id] ?? '').trim(),
      })),
      overallComments: instructions.trim(),
    })
  }

  return (
    <>
      <div className="shrink-0 border-b px-6 pt-6 pb-4">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Push back to the encoder
          </DialogTitle>
          <DialogDescription>
            The application leaves your queue until they resubmit.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <fieldset className="space-y-2" disabled={isPending}>
          <legend className="mb-2 text-xs font-medium">
            What needs correcting
          </legend>
          {EDITABLE.map((section) => {
            const isSelected = Boolean(selected[section.id])
            const checkboxId = `revision-${section.id}`
            return (
              <div
                key={section.id}
                className={cn(
                  'border p-3 transition-colors',
                  isSelected && 'border-primary/40 bg-primary/[0.04]',
                )}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={checkboxId}
                    className="mt-0.5"
                    checked={isSelected}
                    onCheckedChange={(v) =>
                      setSelected((prev) => ({
                        ...prev,
                        [section.id]: v === true,
                      }))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={checkboxId}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {section.label}
                    </Label>
                  </div>
                </div>
                {isSelected && (
                  <Textarea
                    rows={2}
                    className="mt-2"
                    aria-label={`What needs correcting in ${section.label}`}
                    placeholder="Optional note for this section"
                    value={sectionComments[section.id] ?? ''}
                    maxLength={1000}
                    onChange={(e) =>
                      setSectionComments((prev) => ({
                        ...prev,
                        [section.id]: e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            )
          })}
          {READ_ONLY.length > 0 && (
            <p className="pt-1 text-xs text-muted-foreground">
              {READ_ONLY.map((s) => s.label).join(', ')} come from WebLoan, so
              the encoder cannot change them here.
            </p>
          )}
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="revision-overall" className="font-medium">
            What the encoder must fix
          </Label>
          <Textarea
            id="revision-overall"
            ref={instructionsRef}
            rows={3}
            placeholder="Term is 36 months but the product caps at 24; resubmit with the corrected term"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            onBlur={() => setShowError(true)}
            disabled={isPending}
            maxLength={MAX_INSTRUCTIONS}
            aria-required
            aria-invalid={Boolean(showError && tooShort)}
            aria-describedby="revision-overall-help"
          />
          <p
            id="revision-overall-help"
            className={
              showError && tooShort
                ? 'text-xs text-destructive'
                : 'text-xs text-muted-foreground'
            }
          >
            {showError && tooShort
              ? 'Say what to fix, so the encoder can resubmit without guessing.'
              : `Sent with the notification. ${MIN_INSTRUCTIONS} characters minimum.`}
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
            Push back
          </Button>
        </DialogFooter>
      </div>
    </>
  )
}
