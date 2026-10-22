import { useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowClockwise,
  Clock,
  CurrencyCircleDollar,
  Info,
  Queue,
  Stack,
  Timer,
  Tray,
  Users,
  WarningCircle,
} from '@phosphor-icons/react'

import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { formatWaiting } from '@/src/shared/lib/format'
import { useSlaPolicy } from '@/src/features/loans/api/loan-review'
import { useClaimNext, useDeskQueue, useReleaseClaim } from '@/src/features/loans/hooks/use-desk-queue'
import { summarizeDeskQueue, formatPhp } from '@/src/features/loans/model/desk-queue'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { NextClientCard, StatCard } from './review-desk-cards'
import { DeskHeader } from './desk-header'
import { DeskQueueRow, DeskMessage, DeskSkeleton, formatClock } from './review-desk-queue'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/shared/ui/data-display/card'

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
  const release = useReleaseClaim()
  const slaPolicy = useSlaPolicy()
  const currentUserId = useAuthStore((s) => s.user?.userId)

  // Open the loan only when a claim succeeds — never bounce the officer off
  // the desk just because a lease is still open (they may wait on the encoder).
  useEffect(() => {
    if (!claim.isSuccess || !claim.data?.loanId) return
    navigate({
      to: '/loans/approval/$loanId',
      params: { loanId: String(claim.data.loanId) },
      replace: true,
    })
  }, [claim.isSuccess, claim.data?.loanId, navigate])

  const now = Date.now()
  const head = desk?.items[0]
  const queueBehind = useMemo(() => (desk ? desk.items.slice(1) : []), [desk])
  const currentClaims = useMemo(() => {
    if (!desk) return []
    const list = desk.currentClaims?.length
      ? desk.currentClaims
      : desk.currentClaim
        ? [desk.currentClaim]
        : []
    return list
  }, [desk])
  const hasClaim = currentClaims.length > 0
  const policy = slaPolicy.data ?? null
  const stats = useMemo(
    () => (desk ? summarizeDeskQueue(desk.items, now, policy) : null),
    [desk, now, policy],
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
      description=" Try again in a moment."
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
        <Button size="sm" onClick={() => navigate({ to: '/loans/monitoring' })}>
          Go to Loan Monitoring
        </Button>
      }
    />
  ) : (
    <>
      <DeskHeader
        deskLabel={desk.deskLabel}
        scopeDescription={desk.scopeDescription}
        onBack={() => navigate({ to: '/loans/monitoring' })}
      />

      <main className="flex flex-1 flex-col">
        <div className="container mx-auto w-full max-w-5xl flex-1 space-y-5 px-6 py-6">
          {hasClaim && (
            <section className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    Currently serving ({currentClaims.length})
                  </p>
                  <ul className="space-y-1">
                    {currentClaims.map((c) => (
                      <li
                        key={c.groupNo}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span className="font-semibold">{c.clientName}</span>
                        <span className="text-muted-foreground">
                          {c.applications.map((a) => a.lamId).join(', ')}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => {
                            const loanId = c.applications[0]?.loanId
                            if (!loanId) return
                            navigate({
                              to: '/loans/approval/$loanId',
                              params: { loanId: String(loanId) },
                            })
                          }}
                        >
                          Open
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    You can keep taking new clients while these wait (e.g. for the
                    encoder). Release returns them to the queue.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => release.mutate()}
                  disabled={release.isPending}
                >
                  {release.isPending ? 'Releasing…' : 'Release all claims'}
                </Button>
              </div>
            </section>
          )}

        {desk.items.length === 0 && !hasClaim ? (
          <DeskMessage
            icon={<Tray size={22} weight="bold" />}
            title="Queue is clear"
            description={`No clients waiting at your ${desk.deskLabel} desk. Bundles promoted for review appear here automatically.`}
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
                  onClick={() => navigate({ to: '/loans/monitoring' })}
                >
                  Loan Monitoring
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5" aria-live="polite">
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight tabular-nums">
                  {desk.items.length} client
                  {desk.items.length === 1 ? '' : 's'} waiting
                  <span className="flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
                    <span
                      className="size-1.5 animate-pulse rounded-full bg-emerald-500"
                      aria-hidden
                    />
                    live
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Last checked {formatClock(dataUpdatedAt)}
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
                  icon={<Users size={16} weight="bold" />}
                  label="Clients in queue"
                  value={String(stats.clientCount)}
                  hint={`${stats.applicationCount} application${stats.applicationCount === 1 ? '' : 's'} across all bundles`}
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
                  hint="Applications past their handling deadline"
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
              <NextClientCard
                client={head}
                canServe={canServe}
                claiming={claim.isPending}
                onServe={() => claim.mutate()}
                currentUserId={currentUserId}
                slaPolicy={policy}
                now={now}
              />
            )}

            <Card className="shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0 py-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Queue size={16} weight="bold" />
                  Pending clients
                  <Badge variant="secondary" className="gap-1 tabular-nums">
                    <Stack size={11} weight="bold" aria-hidden />
                    {queueBehind.length}
                  </Badge>
                </CardTitle>
               
              </CardHeader>
              <CardContent className="p-0">
                {queueBehind.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No other clients in queue
                  </p>
                ) : (
                  <ul className="divide-y">
                    {queueBehind.map((client) => (
                      <DeskQueueRow
                        key={client.groupNo}
                        client={client}
                        slaPolicy={policy}
                        now={now}
                      />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
        </div>
      </main>
    </>
  )

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40">
      {body}
    </div>
  )
}
