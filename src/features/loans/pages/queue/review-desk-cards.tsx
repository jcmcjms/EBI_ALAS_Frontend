import type { ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/src/shared/ui/avatar'
import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'
import {
  Card,
  CardContent,
} from '@/src/shared/ui/card'
import { Spinner } from '@/src/shared/ui/spinner'
import {
  PlayCircle,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import {
  formatWaiting,
  waitingMinutes,
} from '@/src/features/dashboard/components/pending-queue'
import type { QueuedLoanDto } from '@/src/features/loans/hooks/use-desk-queue'
import {
  assessAging,
} from '@/src/features/loans/utils/loan-aging'
import {
  formatPhp,
} from '@/src/features/loans/utils/desk-queue'
import type { LoanStatus } from '@/src/features/loans/utils/loan-status'
import { initialsOf } from '@/src/shared/lib/name-utils'
import { cn } from '@/src/shared/lib/utils'
import { StatusBadge } from './review-desk-queue'

interface NextUpCardProps {
  item: QueuedLoanDto
  canServe: boolean
  claiming: boolean
  onServe: () => void
  currentUserId?: number
  slaPolicy: Record<string, number> | null
  now: number
}

export function NextUpCard({
  item,
  canServe,
  claiming,
  onServe,
  currentUserId,
  slaPolicy,
  now,
}: NextUpCardProps) {
  const assessment = assessAging(
    item.status as LoanStatus,
    item.enqueuedAt,
    now,
    slaPolicy,
  )
  const isMine = item.ownerUserId != null && item.ownerUserId === currentUserId
  const heldByOther = item.ownerUserId != null && !isMine

  return (
    <section
      aria-label="Next up"
      className="relative overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
      <div className="flex flex-col gap-4 p-5 pl-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10 border">
              <AvatarFallback>{initialsOf(item.clientName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold tracking-tight">
                  {item.lamId}
                </span>
                <StatusBadge status={item.status} />
                {item.hasDeviations && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                  >
                    <WarningCircle size={12} weight="bold" /> warnings
                  </Badge>
                )}
              </div>
              <p
                className="truncate text-sm text-muted-foreground"
                title={item.clientName}
              >
                {item.clientName}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {item.ownerName ? (
              isMine ? (
                <Badge variant="secondary" className="gap-1">
                  <PlayCircle size={12} weight="bold" /> handling — resume
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <UserCircle size={12} /> {item.ownerName}
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-primary">
                next up
              </Badge>
            )}
            <Button
              className="gap-1.5"
              disabled={!canServe}
              onClick={onServe}
              aria-keyshortcuts="Enter"
              title={
                heldByOther
                  ? `Currently with ${item.ownerName} — available after the lock expires`
                  : undefined
              }
            >
              {claiming ? (
                <Spinner className="size-4" />
              ) : (
                <PlayCircle size={16} weight="bold" />
              )}
              Serve next
              <kbd className="ml-0.5 rounded-sm border border-primary-foreground/40 px-1 text-[10px] font-normal text-primary-foreground/70">
                Enter
              </kbd>
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Amount" value={formatPhp(item.proposedAmount)} strong />
          <Fact
            label="Product"
            value={item.product || '\u2014'}
            title={`${item.productCode} \u2014 ${item.product}`}
          />
          <Fact label="Loan type" value={item.loanType ?? '\u2014'} />
          <Fact label="Branch" value={item.branchCode || '\u2014'} />
          <Fact
            label="Term"
            value={item.termDays != null ? `${item.termDays} d` : '\u2014'}
          />
          <Fact
            label="Waiting"
            value={formatWaiting(waitingMinutes(item.enqueuedAt))}
            title={assessment.label}
            tone={
              assessment.tier === 'breach'
                ? 'destructive'
                : assessment.tier === 'warning'
                  ? 'warning'
                  : 'default'
            }
          />
        </dl>

        {item.purpose && (
          <p
            className="line-clamp-2 text-xs text-muted-foreground"
            title={item.purpose}
          >
            Purpose: {item.purpose}
          </p>
        )}
      </div>
    </section>
  )
}

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'destructive'
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'default',
}: StatCardProps) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md border',
            tone === 'destructive'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-border bg-muted/60 text-muted-foreground',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p
            className="truncate text-lg font-semibold tabular-nums tracking-tight"
            title={hint}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface FactProps {
  label: string
  value: string
  title?: string
  strong?: boolean
  tone?: 'default' | 'warning' | 'destructive'
}

export function Fact({ label, value, title, strong, tone = 'default' }: FactProps) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          'truncate text-sm tabular-nums',
          strong ? 'font-semibold' : 'font-medium',
          tone === 'destructive' && 'text-destructive',
          tone === 'warning' && 'text-amber-600 dark:text-amber-400',
        )}
        title={title ?? value}
      >
        {value}
      </dd>
    </div>
  )
}