import {
  ArrowClockwise,
  CheckCircle,
  FloppyDisk,
  WarningCircle,
} from '@phosphor-icons/react'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { cn } from '@/src/shared/lib/utils'
import type { ReviewDraftStatus } from '@/src/features/loans/hooks/use-review-draft'

interface DraftSaveIndicatorProps {
  status: ReviewDraftStatus
  savedAt: number | null
  errorMessage?: string | null
  onRetry?: () => void
  className?: string
}

function formatSavedClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Quiet, non-blocking auto-save status for review drafts. Deliberately not a
 * toast: it sits next to the editor so reviewers always know their notes are
 * safe without being interrupted.
 */
export function DraftSaveIndicator({
  status,
  savedAt,
  errorMessage,
  onRetry,
  className,
}: DraftSaveIndicatorProps) {
  return (
    <p
      aria-live="polite"
      className={cn(
        'flex min-h-4 items-center gap-1.5 text-xs',
        status === 'error' ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      {status === 'saving' ? (
        <>
          <Spinner className="size-3" aria-hidden />
          <span>Saving draft…</span>
        </>
      ) : status === 'saved' && savedAt ? (
        <>
          <CheckCircle
            size={12}
            weight="bold"
            className="shrink-0 text-success"
            aria-hidden
          />
          <span>Draft saved at {formatSavedClock(savedAt)}</span>
        </>
      ) : status === 'error' ? (
        <>
          <WarningCircle size={12} weight="bold" className="shrink-0" aria-hidden />
          <span>{errorMessage ?? 'Draft not saved.'}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:text-foreground"
            >
              <ArrowClockwise size={11} weight="bold" aria-hidden /> Retry
            </button>
          )}
        </>
      ) : (
        <>
          <FloppyDisk size={12} weight="bold" className="shrink-0" aria-hidden />
          <span>Progress auto-saves as you type</span>
        </>
      )}
    </p>
  )
}
