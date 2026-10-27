import { Warning } from '@phosphor-icons/react'
import { Alert, AlertDescription, AlertTitle } from '@/src/shared/ui/feedback/alert'
import type { LoanChecklistDocumentDto } from '@/src/features/loans/api/loan-review'
import { isSubmittedWithoutUpload } from '@/src/features/loans/model/checklist-upload-status'

const MAX_LISTED = 6

interface DocumentFlag {
  flaggedAt: string
  flaggedById: number | string | null
  reason: string | null
  missingCount: number
}

interface Props {
  status: string
  checklist: LoanChecklistDocumentDto[] | undefined
  documentFlag?: DocumentFlag | null
}

export function IncompleteDocumentsWarning({ checklist, documentFlag }: Props) {
  const pending = (checklist ?? []).filter(
    (i) => i.uploadStatus !== 'Uploaded' && i.uploadStatus !== 'Submitted',
  )
  const paperOnly = (checklist ?? []).filter((i) => isSubmittedWithoutUpload(i))
  const hasFlag = documentFlag != null
  if (!hasFlag && pending.length === 0 && paperOnly.length === 0) return null

  const listed = pending.slice(0, MAX_LISTED)
  return (
    <div className="space-y-2">
      {(hasFlag || pending.length > 0) && (
        <Alert
          variant="destructive"
          role="status"
          aria-live="polite"
          className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&_svg]:text-amber-600"
        >
          <Warning />
          <AlertTitle>
            {hasFlag
              ? `Documents flagged: ${documentFlag.missingCount} ${documentFlag.missingCount === 1 ? 'requirement' : 'requirements'} missing`
              : `Incomplete documents: ${pending.length} ${pending.length === 1 ? 'requirement' : 'requirements'} pending`}
          </AlertTitle>
          <AlertDescription className="space-y-1">
            {hasFlag && (
              <p>
                Flagged on {new Date(documentFlag.flaggedAt).toLocaleDateString()}
                {documentFlag.reason ? `. Reason: ${documentFlag.reason}` : ''}. You
                can keep reviewing; the flag clears when all documents are
                uploaded.
              </p>
            )}
            {pending.length > 0 && (
              <p className="text-xs">
                {listed.map((p) => p.checklistDescription ?? p.idCode).join(' · ')}
                {pending.length > MAX_LISTED &&
                  ` · +${pending.length - MAX_LISTED} more`}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
      {paperOnly.length > 0 && (
        <Alert
          role="status"
          aria-live="polite"
          className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&_svg]:text-amber-600"
        >
          <Warning />
          <AlertTitle>
            Submitted without upload: {paperOnly.length}{' '}
            {paperOnly.length === 1 ? 'requirement' : 'requirements'}
          </AlertTitle>
          <AlertDescription className="space-y-1">
            <p>
              These items count as filed in WebLoan (first amortization) but
              have no uploaded file.
            </p>
            <p className="text-xs">
              {paperOnly
                .slice(0, MAX_LISTED)
                .map((p) => p.checklistDescription ?? p.idCode)
                .join(' · ')}
              {paperOnly.length > MAX_LISTED &&
                ` · +${paperOnly.length - MAX_LISTED} more`}
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
