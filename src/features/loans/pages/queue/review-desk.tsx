import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowClockwise,
  Clock,
  CurrencyCircleDollar,
  Info,
  Queue,
  Timer,
  Tray,
  WarningCircle,
} from '@phosphor-icons/react'

import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'
import { Spinner } from '@/src/shared/ui/spinner'
import { formatWaiting } from '@/src/features/dashboard/components/pending-queue'
import { useSlaPolicy } from '@/src/features/loans/api/loan-review'
import { useClaimNext, useDeskQueue } from '@/src/features/loans/hooks/use-desk-queue'
import { summarizeDeskQueue, formatPhp } from '@/src/features/loans/utils/desk-queue'
import { useAuthStore } from '@/src/features/auth/store/authStore'
import { NextUpCard, StatCard } from './review-desk-cards'
import { DeskHeader } from './desk-header'
import { DeskQueueRow, DeskMessage, DeskSkeleton, formatClock } from './review-desk-queue'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/shared/ui/card'

export function ReviewDeskPage() {
  const navigate = useNavigate()
  const {
    data: desk,
    isLoading,
    isError,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = useDeskQueue()
  const claim = useClaimNext()
  const slaPolicy = useSlaPolicy()
  const currentUserId = useAuthStore((s) =>
    s.user?.userId ? Number(s.user.userId) : undefined,
  )

  useEffect(() => {
    if (desk?.currentClaim) {
      navigate(`/loans/approval/${desk.currentClaim.loanId}`, { replace: true })
    }
  }, [desk?.currentClaim, navigate])

  const now = Date.now()
  const head = desk?.items[0]
  const queueBehind = useMemo(() => (desk ? desk.items.slice(1) : []), [desk])
  const stats = useMemo(
    () => (desk ? summarizeDeskQueue(desk.items, now) : null),
    [desk, now],
  )

  const canServe =
    !!desk &&
    desk.items.length > 0 &&
    !claim.isPending &&
    (!head?.ownerUserId || head.ownerUserId === currentUserId)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key !== 'Enter' ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return
      const target = event.target as HTMLElement | null
      if (
        target?.closest(
          "button, a, input, textarea, select, [contenteditable='true']",
        )
      )
        return
      if (!canServe) return
      event.preventDefault()
      claim.mutate()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canServe, claim.mutate])

  const hasDesk =
    !!desk &&
    (desk.deskLabel !== '' || desk.items.length > 0 || !!desk.currentClaim)

  const body = isLoading ? (
    <DeskSkeleton />
  ) : isError ? (
    <DeskMessage
      icon={<WarningCircle size={22} weight="bold" />}
      tone="destructive"
      title="Couldn't load your desk"
      description="Your queue is unchanged — try again in a moment."
      action={
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => refetch()}
        >
          <ArrowClockwise size={14} weight="bold" /> Retry
        </Button>
      }
    />
  ) : !hasDesk ? (
    <DeskMessage
      icon={<Info size={22} weight="bold" />}
      title="No queue for your role"
      description="Your role works from Loan Monitoring — the Review Desk serves Recommender, Evaluator and Approver queues."
      action={
        <Button size="sm" onClick={() => navigate('/loans/monitoring')}>
          Go to Loan Monitoring
        </Button>
      }
    />
  ) : desk.currentClaim ? null : (
    <>
      <DeskHeader
        deskLabel={desk.deskLabel}
        scopeDescription={desk.scopeDescription}
        onBack={() => navigate('/loans/monitoring')}
      />

      <main className="flex flex-1 flex-col">
        {desk.items.length === 0 ? (
          <DeskMessage
            icon={<Tray size={22} weight="bold" />}
            title="Queue is clear"
            description={`Nothing waiting at your ${desk.deskLabel} desk. Files promoted for approval appear here automatically.`}
            meta={`Last checked ${formatClock(dataUpdatedAt)} · auto-refreshes every 30s`}
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <ArrowClockwise size={14} weight="bold" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/loans/monitoring')}
                >
                  Loan Monitoring
                </Button>
              </div>
            }
          />
        ) : (
          <div className="container mx-auto w-full max-w-5xl flex-1 space-y-5 px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5" aria-live="polite">
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight tabular-nums">
                  {desk.items.length} file{desk.items.length === 1 ? '' : 's'}{' '}
                  waiting
                  <span className="flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
                    <span
                      className="size-1.5 animate-pulse rounded-full bg-emerald-500"
                      aria-hidden
                    />
                    live
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Oldest file first · last checked {formatClock(dataUpdatedAt)}{' '}
                  · auto-refreshes every 30s
                </p>
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh queue"
              >
                {isFetching ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <ArrowClockwise size={14} weight="bold" />
                )}
              </Button>
            </div>

            {stats && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={<Queue size={16} weight="bold" />}
                  label="In queue"
                  value={String(stats.fileCount)}
                />
                <StatCard
                  icon={<Timer size={16} weight="bold" />}
                  label="Longest wait"
                  value={formatWaiting(stats.longestWaitMinutes)}
                />
                <StatCard
                  icon={<Clock size={16} weight="bold" />}
                  label="Overdue files"
                  value={String(stats.slaBreachCount)}
                  hint="Files past their handling deadline"
                  tone={stats.slaBreachCount > 0 ? 'destructive' : 'default'}
                />
                <StatCard
                  icon={<CurrencyCircleDollar size={16} weight="bold" />}
                  label="Loan value"
                  value={formatPhp(stats.totalExposure)}
                  hint="Total proposed loan amounts in this desk"
                />
              </div>
            )}

            {head && (
              <NextUpCard
                item={head}
                canServe={canServe}
                claiming={claim.isPending}
                onServe={() => claim.mutate()}
                currentUserId={currentUserId}
                slaPolicy={slaPolicy.data ?? null}
                now={now}
              />
            )}

            <Card className="shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0 py-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Queue size={16} weight="bold" />
                  Pending queue
                  <Badge variant="secondary" className="tabular-nums">
                    {queueBehind.length}
                  </Badge>
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  Queue order matches Loan Monitoring
                </span>
              </CardHeader>
              <CardContent className="p-0">
                {queueBehind.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No other files in queue — new submissions will appear
                    here automatically.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {queueBehind.map((item) => (
                      <DeskQueueRow
                        key={item.loanId}
                        item={item}
                        slaPolicy={slaPolicy.data ?? null}
                        now={now}
                      />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Only one reviewer can work on a file at a time. The assigned
              name stays until the review period ends.
            </p>
          </div>
        )}
      </main>
    </>
  )

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40">
      {body}
    </div>
  )
}