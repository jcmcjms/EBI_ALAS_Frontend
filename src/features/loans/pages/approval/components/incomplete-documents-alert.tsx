import { WarningCircle } from '@phosphor-icons/react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/src/shared/ui/feedback/alert'
import { Button } from '@/src/shared/ui/primitives/button'

export function IncompleteDocumentsAlert({
  count,
  onReview,
}: {
  count: number
  onReview: () => void
}) {
  if (count === 0) return null

  return (
    <Alert
      variant="destructive"
      role="status"
      aria-live="polite"
      className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&_svg]:text-amber-600"
    >
      <WarningCircle weight="fill" />
      <AlertTitle>
        Incomplete documents — {count} requirement{count === 1 ? '' : 's'}{' '}
        pending
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          Some required files are missing. You can still take review actions;
          resolve requirements in Files when ready.
        </span>
        <Button
          variant="link"
          size="sm"
          onClick={onReview}
          className="h-auto p-0 text-xs font-semibold"
        >
          Review missing documents →
        </Button>
      </AlertDescription>
    </Alert>
  )
}
