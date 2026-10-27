import { Warning } from '@phosphor-icons/react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/src/shared/ui/feedback/alert'
import type { LoanChecklistDocumentDto } from '@/src/features/loans/api/loan-review'
import { isSubmittedWithoutUpload } from '@/src/features/loans/model/checklist-upload-status'
import { countNoun, formatLoanDate } from '@/src/shared/lib/format'

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

const nameOf = (item: LoanChecklistDocumentDto) =>
  item.checklistDescription?.trim() || item.idCode

function DocumentList({ items }: { items: LoanChecklistDocumentDto[] }) {
  const shown = items.slice(0, MAX_LISTED)
  const rest = items.length - shown.length
  return (
    <ul className="mt-1 space-y-0.5">
      {shown.map((item) => (
        <li key={item.idCode}>{nameOf(item)}</li>
      ))}
      {rest > 0 && (
        <li className="text-muted-foreground">
          and {countNoun(rest, 'more')}
        </li>
      )}
    </ul>
  )
}

export function IncompleteDocumentsWarning({ checklist, documentFlag }: Props) {
  const pending = (checklist ?? []).filter(
    (i) => i.uploadStatus !== 'Uploaded' && i.uploadStatus !== 'Submitted',
  )
  const paperOnly = (checklist ?? []).filter((i) => isSubmittedWithoutUpload(i))
  const flag = documentFlag ?? null

  if (!flag && pending.length === 0 && paperOnly.length === 0) return null

  return (
    <div className="space-y-2">
      {(flag || pending.length > 0) && (
        <Alert variant="warning" role="status">
          <Warning weight="fill" />
          <AlertTitle>
            {flag
              ? `Flagged ${formatLoanDate(flag.flaggedAt)}: ${countNoun(
                  flag.missingCount,
                  'document',
                )} missing`
              : `${countNoun(pending.length, 'required document')} missing`}
          </AlertTitle>
          <AlertDescription>
            {flag?.reason ? (
              <p>{flag.reason}</p>
            ) : (
              <p>Review can continue while these are outstanding.</p>
            )}
            {!flag && pending.length > 0 && <DocumentList items={pending} />}
          </AlertDescription>
        </Alert>
      )}

      {paperOnly.length > 0 && (
        <Alert variant="warning" role="status">
          <Warning weight="fill" />
          <AlertTitle>
            {countNoun(paperOnly.length, 'document')} marked submitted in
            WebLoan with no file attached
          </AlertTitle>
          <AlertDescription>
            <DocumentList items={paperOnly} />
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
