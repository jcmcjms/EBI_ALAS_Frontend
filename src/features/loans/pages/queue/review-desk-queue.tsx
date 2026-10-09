import { memo, type ReactNode } from 'react'
import { Clock, WarningCircle } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/primitives/badge'
import {
  Card,
  CardContent,
} from '@/src/shared/ui/data-display/card'
import { Skeleton } from '@/src/shared/ui/feedback/skeleton'
import {
  formatWaiting,
  waitingMinutes,
} from '@/src/shared/lib/format'
import type { QueuedLoanDto } from '@/src/features/loans/hooks/use-desk-queue'
import {
  AGING_BADGE_CLASS,
  assessAging,
} from '@/src/shared/lib/loan-aging'
import { formatPhp } from '@/src/features/loans/model/desk-queue'
import {
  LOAN_STATUS_META,
  type LoanStatus,
} from '@/src/features/loans/model/loan-status'
import { cn } from '@/src/shared/lib/utils'

interface DeskQueueRowProps {
  item: QueuedLoanDto
  slaPolicy: Record<string, number> | null
  now: number
}

export const DeskQueueRow = memo(function DeskQueueRow({
  item,
  slaPolicy,
  now,
}: DeskQueueRowProps) {
  const assessment = assessAging(
    item.status as LoanStatus,
    item.enqueuedAt,
    now,
    slaPolicy,
  )
  const waitTone =
    assessment.tier === 'breach'
      ? 'text-destructive'
      : assessment.tier === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground'

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/60 text-xs font-semibold tabular-nums text-muted-foreground">
        #{item.position}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-medium">{item.lamId}</span>
          <StatusBadge status={item.status} />
          {item.hasDeviations && (
            <WarningCircle
              size={12}
              weight="bold"
              className="text-amber-600 dark:text-amber-400"
              aria-label="Has deviations"
            />
          )}
        </div>
        <p
          className="truncate text-xs text-muted-foreground"
          title={`${item.clientName} · ${item.product} · Branch ${item.branchCode}`}
        >
          <span className="font-medium text-foreground/85">
            {item.clientName}
          </span>
          {' · '}
          {item.product}
          {' · '}
          {item.loanType ?? '—'}
          {' · '}
          {item.branchCode}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-sm font-medium tabular-nums sm:block">
          {formatPhp(item.proposedAmount)}
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-xs tabular-nums',
            waitTone,
          )}
        >
          <Clock size={12} /> {formatWaiting(waitingMinutes(item.enqueuedAt))}
        </span>
        <AgingPill assessment={assessment} />
      </div>
    </li>
  )
})

export function StatusBadge({ status }: { status: string }) {
  const meta = LOAN_STATUS_META[status as LoanStatus]
  if (!meta) return <Badge variant="outline">{status}</Badge>
  return (
    <Badge
      variant="outline"
      className={cn('font-normal', meta.className)}
      title={meta.hint}
    >
      {meta.label}
    </Badge>
  )
}

export function AgingPill({
  assessment,
}: {
  assessment: ReturnType<typeof assessAging>
}) {
  if (assessment.tier !== 'warning' && assessment.tier !== 'breach') return null
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-4 px-1.5 text-[10px] font-normal',
        AGING_BADGE_CLASS[assessment.tier],
      )}
    >
      {assessment.tier === 'breach' ? 'Overdue' : 'Watch'}
    </Badge>
  )
}

interface DeskMessageProps {
  icon: ReactNode
  title: string
  description: string
  tone?: 'muted' | 'destructive'
  meta?: string
  action?: ReactNode
}

export function DeskMessage({
  icon,
  title,
  description,
  tone = 'muted',
  meta,
  action,
}: DeskMessageProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <div
          className={cn(
            'flex size-11 items-center justify-center rounded-full border',
            tone === 'destructive'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-border bg-background text-muted-foreground',
          )}
        >
          {icon}
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
        {action}
      </div>
    </div>
  )
}

export function DeskSkeleton() {
  return (
    <div
      className="container mx-auto w-full max-w-5xl space-y-5 px-6 py-6"
      aria-busy="true"
      aria-label="Loading desk queue"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-8 w-8" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
      <Skeleton className="h-40" />
      <Card className="shadow-none">
        <CardContent className="divide-y p-0">
          {[0, 1].map((row) => (
            <div key={row} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-7" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}