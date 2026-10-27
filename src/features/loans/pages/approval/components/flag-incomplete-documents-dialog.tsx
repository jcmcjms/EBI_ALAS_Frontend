import { useMemo, useState } from 'react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/shared/ui/feedback/alert-dialog'
import { Button } from '@/src/shared/ui/primitives/button'
import { Label } from '@/src/shared/ui/primitives/label'
import { Textarea } from '@/src/shared/ui/primitives/textarea'
import { Checkbox } from '@/src/shared/ui/primitives/checkbox'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { countNoun } from '@/src/shared/lib/format'
import type { LoanChecklistDocumentDto } from '@/src/features/loans/api/loan-review'

/** Mirrors the minimum the API enforces on the flag reason. */
const MIN_REASON = 5
const MAX_REASON = 2000

interface FlagIncompleteDocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  items: LoanChecklistDocumentDto[]
  isSubmitting: boolean
  onSubmit: (payload: {
    missingRequirementCodes: string[]
    comments: string
  }) => void
}

const isMissing = (item: LoanChecklistDocumentDto) =>
  item.uploadStatus !== 'Uploaded' && item.uploadStatus !== 'Submitted'

const nameOf = (item: LoanChecklistDocumentDto) =>
  item.checklistDescription?.trim() || item.idCode

export function FlagIncompleteDocumentsDialog({
  open,
  onOpenChange,
  items,
  isSubmitting,
  onSubmit,
}: FlagIncompleteDocumentsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        {open && (
          <FlagForm
            items={items}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}

function FlagForm({
  items,
  isSubmitting,
  onSubmit,
}: {
  items: LoanChecklistDocumentDto[]
  isSubmitting: boolean
  onSubmit: FlagIncompleteDocumentsDialogProps['onSubmit']
}) {
  const missing = useMemo(() => items.filter(isMissing), [items])
  const uploadedCount = items.length - missing.length

  // Mounted only while the dialog is open, so the defaults are the initial
  // state rather than something an effect has to reset on every open.
  const [selected, setSelected] = useState<string[]>(() =>
    missing.map((item) => item.idCode),
  )
  const [reason, setReason] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const reasonLength = reason.trim().length
  const selectionError =
    selected.length === 0 ? 'Choose at least one document.' : undefined
  const reasonError =
    reasonLength < MIN_REASON
      ? 'Add a note so the encoder knows what to upload.'
      : undefined

  const handleSubmit = () => {
    setShowErrors(true)
    if (selectionError || reasonError) return
    onSubmit({ missingRequirementCodes: selected, comments: reason.trim() })
  }

  const toggle = (code: string, checked: boolean) =>
    setSelected((prev) =>
      checked ? [...prev, code] : prev.filter((c) => c !== code),
    )

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Flag missing documents</AlertDialogTitle>
        <AlertDialogDescription>
          The encoder is told what to upload. The application stays with you.
        </AlertDialogDescription>
      </AlertDialogHeader>

      {missing.length === 0 ? (
        <p className="border border-dashed py-6 text-center text-muted-foreground">
          Every required document is uploaded.
        </p>
      ) : (
        <fieldset className="space-y-2" disabled={isSubmitting}>
          <legend className="mb-2 text-xs font-medium">
            {countNoun(missing.length, 'document')} missing
            {uploadedCount > 0 && (
              <span className="block font-normal text-muted-foreground">
                {countNoun(uploadedCount, 'other')} already uploaded
              </span>
            )}
          </legend>
          <div className="max-h-56 space-y-2 overflow-y-auto border p-3">
            {missing.map((item) => {
              const id = `flag-doc-${item.idCode}`
              return (
                <label
                  key={item.idCode}
                  htmlFor={id}
                  className="flex cursor-pointer items-start gap-2 text-sm"
                >
                  <Checkbox
                    id={id}
                    className="mt-0.5"
                    checked={selected.includes(item.idCode)}
                    onCheckedChange={(checked) =>
                      toggle(item.idCode, checked === true)
                    }
                  />
                  <span className="min-w-0">
                    {nameOf(item)}
                    {item.checklistDescription && (
                      <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                        {item.idCode}
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
          {showErrors && selectionError && (
            <p role="alert" className="text-xs text-destructive">
              {selectionError}
            </p>
          )}
        </fieldset>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="flag-reason" className="font-medium">
          What the encoder needs to do
        </Label>
        <Textarea
          id="flag-reason"
          rows={3}
          value={reason}
          maxLength={MAX_REASON}
          disabled={isSubmitting}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setShowErrors(true)}
          placeholder="Payslip is blurred, COE has no compensation clause"
          aria-required
          aria-invalid={Boolean(showErrors && reasonError)}
          aria-describedby="flag-reason-help"
        />
        <p
          id="flag-reason-help"
          className={
            showErrors && reasonError
              ? 'text-xs text-destructive'
              : 'text-xs text-muted-foreground'
          }
        >
          {showErrors && reasonError
            ? reasonError
            : `Sent with the notification. ${MIN_REASON} characters minimum.`}
        </p>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || missing.length === 0}
          className="gap-2"
        >
          {isSubmitting && <Spinner className="size-3.5" aria-hidden />}
          Flag documents
        </Button>
      </AlertDialogFooter>
    </>
  )
}
