import { Avatar, AvatarFallback } from '@/src/shared/ui/data-display/avatar'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardContent,
} from '@/src/shared/ui/data-display/card'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import {
  PlayCircle,
  Stack,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import {
  formatWaiting,
  waitingMinutes,
} from '@/src/shared/lib/format'
import type { QueuedClientDto } from '@/src/features/loans/hooks/use-desk-queue'
import { cn } from '@/src/shared/lib/utils'
import {
  formatPhp,
  summarizeClient,
} from '@/src/features/loans/model/desk-queue'
import { initialsOf } from '@/src/shared/lib/name-utils'
import { StatusBadge } from './review-desk-queue'

interface NextClientCardProps {
  client: QueuedClientDto
  canServe: boolean
  claiming: boolean
  onServe: () => void
  currentUserId?: string
  slaPolicy: Record<string, number> | null
  now: number
}

export function NextClientCard({
  client,
  canServe,
  claiming,
  onServe,
  currentUserId,
  slaPolicy,
  now,
}: NextClientCardProps) {
  const summary = summarizeClient(client, now, slaPolicy)
  const assessment = summary.worstAging
  const isMine =
    client.ownerUserId != null && client.ownerUserId === currentUserId
  const heldByOther = client.ownerUserId != null && !isMine
  const isBundle = summary.applicationCount > 1

  return (
    <section
      aria-label="Next client up"
      className="relative overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10 border">
              <AvatarFallback>{initialsOf(client.clientName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="truncate text-sm font-semibold tracking-tight"
                  title={client.clientName}
                >
                  {client.clientName}
                </span>
                <Badge variant="outline" className="gap-1 font-normal">
                  <Stack size={12} weight="bold" aria-hidden />
                  {summary.applicationCount} application
                  {isBundle ? 's' : ''}
                </Badge>
                {summary.hasDeviations && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                  >
                    <WarningCircle size={12} weight="bold" /> deviations
                  </Badge>
                )}
              </div>
              <p
                className="truncate font-mono text-xs text-muted-foreground"
                title={`Application group ${client.groupNo}`}
              >
                {client.groupNo}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {client.ownerName ? (
              isMine ? (
                <Badge variant="secondary" className="gap-1">
                  <PlayCircle size={12} weight="bold" /> handling
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <UserCircle size={12} /> {client.ownerName}
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="font-normal">
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
                  ? `Currently with ${client.ownerName}. Available when their review finishes`
                  : isBundle
                    ? `Serve all ${summary.applicationCount} applications of ${client.clientName} together`
                    : undefined
              }
            >
              {claiming ? (
                <Spinner className="size-4" />
              ) : (
                <PlayCircle size={16} weight="bold" />
              )}
              Serve client
              <kbd className="ml-0.5 rounded-sm border border-primary-foreground/40 px-1 text-[11px] font-normal text-primary-foreground/70">
                Enter
              </kbd>
            </Button>
          </div>
        </div>

        <ul
          className="max-h-44 divide-y overflow-y-auto rounded-md border"
          aria-label={`Applications of ${client.clientName}`}
        >
          {client.applications.map((app) => (
            <li
              key={app.loanId}
              className="flex items-center gap-3 px-3 py-2 text-xs"
            >
              <span className="font-mono font-medium">{app.lamId}</span>
              <StatusBadge status={app.status} />
              <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-muted-foreground">
                <span className="truncate">
                  {app.product || app.productCode || '—'}
                </span>
                {app.loanType ? (
                  <span className="shrink-0">{app.loanType}</span>
                ) : null}
                {app.termDays != null ? (
                  <span className="shrink-0 tabular-nums">
                    {app.termDays} d
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatPhp(app.proposedAmount)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Fact
            label={isBundle ? 'Total amount' : 'Amount'}
            value={formatPhp(summary.totalAmount)}
            strong
            title={
              isBundle
                ? `Combined proposed amounts of ${summary.applicationCount} applications`
                : undefined
            }
          />
          <Fact label="Branch" value={summary.branchCode || '—'} />
          <Fact
            label="Waiting"
            value={formatWaiting(waitingMinutes(summary.oldestEnqueuedAt))}
            title={assessment.label}
            tone={
              assessment.tier === 'breach'
                ? 'destructive'
                : assessment.tier === 'warning'
                  ? 'warning'
                  : 'default'
            }
          />
          <Fact
            label="Applications"
            value={String(summary.applicationCount)}
            title="Reviewed together as one bundle"
          />
        </dl>
      </div>
    </section>
  )
}

interface StatCardProps {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'destructive'
}

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-1 truncate text-lg font-semibold tabular-nums tracking-tight',
            tone === 'destructive' && 'text-destructive',
          )}
          title={hint}
        >
          {value}
        </p>
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
      <dt className="text-[11px] font-medium text-muted-foreground">
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
