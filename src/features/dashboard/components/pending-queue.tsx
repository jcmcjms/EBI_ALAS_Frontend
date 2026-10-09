import { memo, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Avatar, AvatarFallback } from '@/src/shared/ui/data-display/avatar'
import { cn } from '@/src/shared/lib/utils'
import { initialsOf } from '@/src/shared/lib/name-utils'
import { formatWaiting, waitingMinutes } from '@/src/shared/lib/format'
import type { PendingQueueItem, LoanStatus } from '../types'
import { assessAging } from '@/src/shared/lib/loan-aging'
import { useAuthStore } from '@/src/shared/store/auth-store'

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

interface PendingQueueProps {
  data: PendingQueueItem[]
  slaPolicy?: Record<string, number> | null
}

export const PendingQueue = memo(function PendingQueue({
  data,
  slaPolicy = null,
}: PendingQueueProps) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const displayData = useMemo(() => data.slice(0, 5), [data])

  const pendingStatuses = useMemo(
    () => [...new Set(data.map((d) => d.statusKey))].join(','),
    [data],
  )

  return (
    <Card id="pending-queue" className="scroll-mt-24 flex flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-xl">
          Pending Queue
          {data.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {data.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Queue is clear — no pending applications.
            </p>
            {user?.role === 'Encoder' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/loans/create' })}
              >
                Create New Loan
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {displayData.map((item) => {
              const mins = waitingMinutes(item.date)

              const assessment = assessAging(
                item.statusKey as unknown as Parameters<typeof assessAging>[0],
                item.date,
                Date.now(),
                slaPolicy,
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {item.lamId}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0 h-4 font-normal',
                          statusStyles[item.status],
                        )}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p
                      className="text-xs truncate"
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
                  <div className="text-right shrink-0">
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
        )}
      </CardContent>
      {data.length > 5 && (
        <CardFooter className="border-t p-3 justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate({ to: '/loans/monitoring', search: { status: pendingStatuses } })
            }
            className="w-full text-sm"
          >
            View all {data.length} pending loans
          </Button>
        </CardFooter>
      )}
    </Card>
  )
})
