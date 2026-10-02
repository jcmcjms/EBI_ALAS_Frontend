import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/src/shared/ui/button'
import { cn } from '@/src/shared/lib/utils'
import {
  AGING_BADGE_CLASS,
  assessAging,
} from '@/src/features/loans/utils/loan-aging'
import type { LoanStatus } from '@/src/features/loans/utils/loan-status'

export const SharedTimerContext = createContext<number>(Date.now())

export function SharedTimerProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <SharedTimerContext.Provider value={now}>
      {children}
    </SharedTimerContext.Provider>
  )
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86_400)
  const remSecondsAfterDays = total % 86_400
  const hours = Math.floor(remSecondsAfterDays / 3_600)
  const minutes = Math.floor((remSecondsAfterDays % 3_600) / 60)
  const seconds = remSecondsAfterDays % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return days > 0
    ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
    : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

interface TimeLapsedIndicatorProps {
  lastActionDate: string
  status: LoanStatus
  slaPolicy?: Record<string, number> | null
}

export function TimeLapsedIndicator({
  lastActionDate,
  status,
  slaPolicy,
}: TimeLapsedIndicatorProps) {
  const now = useContext(SharedTimerContext)

  const TERMINAL_STATUSES = new Set(['Cancelled', 'Disbursed', 'OnGoing'])
  const effectiveNow = TERMINAL_STATUSES.has(status)
    ? new Date(lastActionDate).getTime()
    : now

  const assessment = assessAging(
    status,
    lastActionDate,
    effectiveNow,
    slaPolicy,
  )

  return (
    <span
      title={
        assessment.slaHours === null
          ? 'No handling SLA for this stage'
          : `${assessment.label} — ${assessment.pctOfSla?.toFixed(0)}% consumed`
      }
      aria-label={`Time in stage ${formatElapsed(effectiveNow - new Date(lastActionDate).getTime())}, ${assessment.label}`}
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums',
        AGING_BADGE_CLASS[assessment.tier],
      )}
    >
      {formatElapsed(effectiveNow - new Date(lastActionDate).getTime())}
    </span>
  )
}

export function SkeletonRow({ colSpan }: { colSpan: number }) {
  return (
    <tr className="border-b">
      <td colSpan={colSpan} className="py-2 px-4 h-12">
        <div className="h-3 w-full max-w-[180px] rounded bg-muted animate-pulse" />
      </td>
    </tr>
  )
}

interface TableFooterProps {
  rowCount: number
  pageIndex: number
  pageSize: number
  onPreviousPage: () => void
  onNextPage: () => void
  canPreviousPage: boolean
  canNextPage: boolean
}

export function TableFooter({
  rowCount,
  pageIndex,
  pageSize,
  onPreviousPage,
  onNextPage,
  canPreviousPage,
  canNextPage,
}: TableFooterProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
      <div>
        {rowCount === 0 ? (
          '0 entries'
        ) : (
          <>
            Showing {pageIndex * pageSize + 1} to{' '}
            {Math.min((pageIndex + 1) * pageSize, rowCount)} of {rowCount}{' '}
            {rowCount === 1 ? 'entry' : 'entries'}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onPreviousPage}
          disabled={!canPreviousPage}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onNextPage}
          disabled={!canNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  )
}