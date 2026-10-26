import { format } from 'date-fns'
import { ArrowCounterClockwise, ClockCounterClockwise, UserCircle } from '@phosphor-icons/react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Label } from '@/src/shared/ui/primitives/label'
import { Separator } from '@/src/shared/ui/data-display/separator'
import { Textarea } from '@/src/shared/ui/primitives/textarea'
import { RichText } from '@/src/shared/ui/data-display/rich-text'
import type { RevisionRequest } from '../../types/revision-request'

interface RevisionSidebarProps {
  requests: RevisionRequest[]
  notes: string
  onNotesChange: (value: string) => void
  notesError?: string
  disabled?: boolean
}

export function RevisionSidebar({
  requests,
  notes,
  onNotesChange,
  notesError,
  disabled,
}: RevisionSidebarProps) {
  const open = requests.filter((r) => !r.isResolved)

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowCounterClockwise size={18} weight="bold" className="text-amber-600" />
            Evaluator Feedback
          </CardTitle>
          <CardDescription>
            Only sections listed here are open for correction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {open.length === 0 ? (
            <p className="italic text-muted-foreground">
              No open feedback recorded.
            </p>
          ) : (
            open.map((rev) => (
              <div key={rev.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <UserCircle size={14} />
                  <span>
                    {rev.requestedByName} ({rev.requestedByRole})
                  </span>
                  <span>
                    {format(new Date(rev.requestedAt), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <RichText value={rev.overallComments} emptyFallback={null} />
                {rev.sections
                  .filter((s) => s.comments.trim().length > 0)
                  .map((s) => (
                    <div key={s.sectionId} className="space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {s.sectionLabel}
                      </Badge>
                      <div className="border-l-2 border-border pl-2">
                        <RichText value={s.comments} emptyFallback={null} />
                      </div>
                    </div>
                  ))}
                <Separator />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClockCounterClockwise size={18} /> Resubmission notes
          </CardTitle>
          <CardDescription>
            Required for audit. Briefly explain the corrections made.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="revision-notes">
            Notes <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="revision-notes"
            placeholder="e.g. Updated NTHP per the new payslip; attached the revised CI."
            className="min-h-[100px]"
            value={notes}
            aria-invalid={Boolean(notesError)}
            aria-describedby={
              notesError ? 'revision-notes-error' : undefined
            }
            disabled={disabled}
            maxLength={2000}
            onChange={(e) => onNotesChange(e.target.value)}
          />
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {notesError ? (
              <p id="revision-notes-error" className="text-destructive">
                {notesError}
              </p>
            ) : (
              notes.trim().length > 0 &&
              notes.trim().length < 10 && (
                <p>Minimum 10 characters required</p>
              )
            )}
            <span className="ml-auto">{notes.length}/2000</span>
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}
