import { WarningCircle } from '@phosphor-icons/react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/src/shared/ui/feedback/alert'
import { Button } from '@/src/shared/ui/primitives/button'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { countNoun, formatLoanDate } from '@/src/shared/lib/format'

const SHOWN = 3

/** Names first, then how many are left over; never a bare reassurance line. */
function summarise(names: string[]): string {
  if (names.length === 0) return 'The checklist has gaps.'
  const shown = names.slice(0, SHOWN)
  const rest = names.length - shown.length
  return rest > 0
    ? `${shown.join(', ')} and ${countNoun(rest, 'other')}`
    : shown.join(', ')
}

interface IncompleteDocumentsAlertProps {
  /** Documents still missing from the checklist. */
  count: number
  /** Their names, shown inline so the count is not a blind number. */
  missingNames?: string[]
  onReview: () => void

  /** Set once a reviewer has flagged the file. The flag does not clear itself. */
  flag?: {
    flaggedAt: string
    reason: string | null
    missingCount: number
  } | null
  canClearFlag?: boolean
  isClearing?: boolean
  onClearFlag?: () => void
}

export function IncompleteDocumentsAlert({
  count,
  missingNames,
  onReview,
  flag,
  canClearFlag,
  isClearing,
  onClearFlag,
}: IncompleteDocumentsAlertProps) {
  if (count === 0 && !flag) return null

  return (
    <Alert variant="warning" role="status">
      <WarningCircle weight="fill" />
      <AlertTitle>
        {flag
          ? `Flagged ${formatLoanDate(flag.flaggedAt)}: ${countNoun(
              flag.missingCount,
              'document',
            )} missing`
          : `${countNoun(count, 'required document')} missing`}
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0">
          {flag?.reason ?? summarise(missingNames ?? [])}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-3">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onReview}
            className="h-auto p-0 text-xs font-semibold"
          >
            See the list
          </Button>
          {canClearFlag && flag && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onClearFlag}
              disabled={isClearing}
              className="h-auto gap-1.5 p-0 text-xs font-semibold"
            >
              {isClearing && <Spinner className="size-3" aria-hidden />}
              Clear flag
            </Button>
          )}
        </span>
      </AlertDescription>
    </Alert>
  )
}
