import { useMemo, useState } from 'react'
import { ArrowCounterClockwise, Lock } from '@phosphor-icons/react'

import { cn } from '@/src/shared/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/shared/ui/dialog'
import { Button } from '@/src/shared/ui/button'
import { Checkbox } from '@/src/shared/ui/checkbox'
import { Label } from '@/src/shared/ui/label'
import { Textarea } from '@/src/shared/ui/textarea'
import {
  SECTIONS,
  type SectionDef,
} from '@/src/features/loans/constants/sections'
import type {
  CreateRevisionRequestPayload,
  RevisionSectionId,
} from '../types/revision-request'

const FEEDBACK_SECTIONS = SECTIONS.filter(
  (s): s is SectionDef & { id: RevisionSectionId } =>
    s.id !== 'approval-form',
)

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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
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

interface PushbackDialogFormProps {
  onSubmit: (payload: CreateRevisionRequestPayload) => void
  isPending: boolean
  onDismiss: () => void
}

function PushbackDialogForm({
  onSubmit,
  isPending,
  onDismiss,
}: PushbackDialogFormProps) {
  const [overallComments, setOverallComments] = useState('')
  const [selected, setSelected] = useState<
    Partial<Record<RevisionSectionId, boolean>>
  >({})
  const [sectionComments, setSectionComments] = useState<
    Partial<Record<RevisionSectionId, string>>
  >({})

  const selectedCount = useMemo(
    () => FEEDBACK_SECTIONS.filter((s) => selected[s.id]).length,
    [selected],
  )

  const canSubmit = overallComments.trim().length >= 10 && !isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      sections: FEEDBACK_SECTIONS.filter((s) => selected[s.id]).map((s) => ({
        sectionId: s.id,
        comments: (sectionComments[s.id] ?? '').trim(),
      })),
      overallComments: overallComments.trim(),
    })
  }

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
            Push Back with Revision Instructions
          </DialogTitle>
          <DialogDescription>
            Return this application to the encoder for revision. Select the
            sections that need correction — the encoder will see these
            instructions when they open the application.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-2">
          {FEEDBACK_SECTIONS.map((section) => {
            const isSystemSourced = section.systemSourced ?? false
            const isSelected = !!selected[section.id]

            return (
              <div
                key={section.id}
                className={cn(
                  'rounded-md border p-3 transition-colors',
                  isSelected && !isSystemSourced
                    ? 'border-amber-300 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10'
                    : 'bg-background',
                  isSystemSourced && 'opacity-70',
                )}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`revision-${section.id}`}
                    checked={isSelected}
                    disabled={isSystemSourced || isPending}
                    onCheckedChange={(v) =>
                      setSelected((prev) => ({
                        ...prev,
                        [section.id]: v === true,
                      }))
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={`revision-${section.id}`}
                      className={cn(
                        'items-start gap-1.5 text-xs font-medium',
                        isSystemSourced
                          ? 'cursor-not-allowed opacity-70'
                          : 'cursor-pointer',
                      )}
                    >
                      {section.label}
                      {isSystemSourced && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                          <Lock size={10} weight="fill" /> auto-synced
                        </span>
                      )}
                    </Label>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
                {isSelected && !isSystemSourced && (
                  <Textarea
                    rows={2}
                    className="mt-2 text-xs"
                    placeholder={`What needs to be revised in "${section.label}"?`}
                    value={sectionComments[section.id] ?? ''}
                    disabled={isPending}
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
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="revision-overall" className="text-xs font-semibold">
            Overall Instructions <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="revision-overall"
            rows={3}
            placeholder="Summarize what the encoder must fix before resubmitting…"
            value={overallComments}
            onChange={(e) => setOverallComments(e.target.value)}
            disabled={isPending}
            maxLength={2000}
          />
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {overallComments.trim().length > 0 &&
              overallComments.trim().length < 10 && (
                <p>Minimum 10 characters required</p>
              )}
            {selectedCount > 0 && (
              <span>
                {selectedCount} section{selectedCount === 1 ? '' : 's'} flagged
              </span>
            )}
            <span className="ml-auto">{overallComments.length}/2000</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t px-6 py-4">
        <DialogFooter>
          <Button variant="outline" onClick={onDismiss} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isPending ? (
              <span className="animate-pulse">Processing…</span>
            ) : (
              <>
                <ArrowCounterClockwise size={16} />
                Push Back to Encoder
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    </>
  )
}
