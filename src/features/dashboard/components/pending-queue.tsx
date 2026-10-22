import { memo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { Avatar, AvatarFallback } from '@/src/shared/ui/data-display/avatar'
import { cn } from '@/src/shared/lib/utils'
import { initialsOf } from '@/src/shared/lib/name-utils'
import { formatWaiting, waitingMinutes } from '@/src/shared/lib/format'
import type { LoanStatus } from '../types'
import { assessAging } from '@/src/shared/lib/loan-aging'
import { usePendingQueue } from '../hooks/use-pending-queue'

const PAGE_SIZE = 5

const statusStyles: Record<LoanStatus, string> = {
  'On Going':
    'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  'For Recommendation':
    'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  'For Checking':
    'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  'For Approval':
    'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  Approved:
    'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  Rejected: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  Cancelled:
    'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',
  Expired: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  'For Revision':
    'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  'For Disbursement':
    'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  Disbursed:
    'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  'For Incomplete Documents':
    'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
}

interface PendingQueueTableProps {
  status: string
  title: string
}

export const PendingQueueTable = memo(function PendingQueueTable({
  status,
  title,
}: PendingQueueTableProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading } = usePendingQueue(status, page, PAGE_SIZE)
  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge variant="secondary" className="tabular-nums">
          {totalCount}
        </Badge>
      </div>
      {isLoading && items.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No pending applications.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <ul className="divide-y">
            {items.map((item) => {
              const mins = waitingMinutes(item.date)

              const assessment = assessAging(
                item.statusKey as unknown as Parameters<typeof assessAging>[0],
                item.date,
                Date.now(),
                null,
              )

              return (
                <li key={item.lamId}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: '/loans/monitoring',
                        search: { id: item.lamId },
                      })
                    }
                    className={cn(
                      'flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                      item.position === 1 && 'bg-primary/[0.04]',
                    )}
                  >
                    <span className="w-8 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                      #{item.position}
                    </span>
                    <Avatar size="sm" className="border">
                      <AvatarFallback>
                        {initialsOf(item.clientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {item.lamId}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-4 px-1.5 py-0 text-[10px] font-normal',
                            statusStyles[item.status],
                          )}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p
                        className="truncate text-xs"
                        title={`${item.clientName} · encoded by ${item.encoderName} · ${item.branch}`}
                      >
                        <span className="font-medium text-foreground/90">
                          {item.clientName}
                        </span>
                        <span className="text-muted-foreground">
                          {' '}
                          · by {item.encoderName}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={cn(
                          'text-sm font-medium tabular-nums',
                          assessment.tier === 'warning' &&
                            'text-amber-600 dark:text-amber-400',
                          assessment.tier === 'breach' &&
                            'text-red-600 dark:text-red-400',
                        )}
                      >
                        {formatWaiting(mins)}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          {totalCount > PAGE_SIZE && (
            <footer className="flex items-center justify-between border-t px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <CaretLeft size={14} /> Prev
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <CaretRight size={14} />
              </Button>
            </footer>
          )}
        </div>
      )}
    </section>
  )
})
