import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { LOAN_STATUS_META } from '@/src/shared/lib/api/types'
import { cn } from '@/src/shared/lib/utils'
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
} from './account-states'
import type { ProcessedLoan } from '../api/account'

interface RecentApplicationsListProps {
  loansQuery: {
    isLoading: boolean
    isError: boolean
    data: ProcessedLoan[] | undefined
    refetch: () => void
  }
  onNewApplication: () => void
  onViewAll: () => void
}

export function RecentApplicationsList({
  loansQuery,
  onNewApplication,
  onViewAll,
}: RecentApplicationsListProps) {
  return (
    <Card>
      <CardHeader className="border-b bg-muted/30 py-3">
        <CardTitle className="text-sm">Recent Applications</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {loansQuery.isLoading ? (
          <ListSkeleton rows={4} />
        ) : loansQuery.isError ? (
          <ErrorState
            message="Failed to load your applications."
            onRetry={() => loansQuery.refetch()}
          />
        ) : (loansQuery.data ?? []).length === 0 ? (
          <EmptyState
            title="No applications yet"
            hint="Applications you encode will be listed here."
            action={
              <Button variant="outline" size="sm" onClick={onNewApplication}>
                New application
              </Button>
            }
          />
        ) : (
          loansQuery.data!.map((loan) => {
            const meta =
              LOAN_STATUS_META[loan.status as keyof typeof LOAN_STATUS_META]
            return (
              <div
                key={loan.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{loan.lamId}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {loan.clientName}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs font-semibold tabular-nums">
                    ₱{loan.proposedAmount.toLocaleString()}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn('text-xs font-normal', meta?.className)}
                  >
                    {meta?.label ?? loan.status}
                  </Badge>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
