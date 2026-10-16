import { useState } from 'react'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { useAccountActivity } from '../hooks/use-account'
import { ActivityTimeline, toTimelineItems } from './activity-timeline'
import { EmptyState, ErrorState, LoadingState } from './account-states'
import type { ActivityKind } from '../types'
import { ACTIVITY_META } from '../types'

const ACTION_OPTIONS: { value: ''; label: string }[] = [
  { value: '', label: 'All types' },
]

const KIND_OPTIONS = (
  Object.keys(ACTIVITY_META) as ActivityKind[]
).map((kind) => ({ value: kind, label: ACTIVITY_META[kind].label }))

export function ActivityTab() {
  const [limit, setLimit] = useState(10)
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const rangeInvalid = Boolean(from && to && from > to)
  const filters = {
    from: from || undefined,
    to: to || undefined,
    action: action || undefined,
  }
  const activityQuery = useAccountActivity(limit, rangeInvalid ? {} : filters)
  const items = toTimelineItems(activityQuery.data ?? [])
  const hasFilters = Boolean(action || from || to)

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30 py-3">
        <CardTitle className="text-sm">Activity History</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Type
            <select
              className="h-8 rounded-none border border-input bg-background px-2 text-sm text-foreground"
              value={action}
              onChange={(e) => {
                setAction(e.target.value)
                setLimit(10)
              }}
            >
              {[...ACTION_OPTIONS, ...KIND_OPTIONS].map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <input
              type="date"
              className="h-8 rounded-none border border-input bg-background px-2 text-sm text-foreground"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value)
                setLimit(10)
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <input
              type="date"
              className="h-8 rounded-none border border-input bg-background px-2 text-sm text-foreground"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value)
                setLimit(10)
              }}
            />
          </label>
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAction('')
                setFrom('')
                setTo('')
                setLimit(10)
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        {rangeInvalid ? (
          <p className="mb-4 text-sm text-destructive">
            Start date must be on or before end date.
          </p>
        ) : null}

        {activityQuery.isLoading ? (
          <LoadingState label="Loading activity…" />
        ) : activityQuery.isError ? (
          <ErrorState
            message="Failed to load activity history."
            onRetry={() => activityQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={
              hasFilters
                ? 'No activity matches these filters.'
                : 'No activity recorded yet'
            }
            hint={
              hasFilters
                ? 'Try a wider date range or clear the type filter.'
                : 'Every action you take on a loan application is logged here for audit.'
            }
          />
        ) : (
          <>
            {!hasFilters && items.length === 1 ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Showing 1 of 1 event. No other activity recorded in the last 90
                days.
              </p>
            ) : hasFilters ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Showing {items.length} matching event
                {items.length === 1 ? '' : 's'}.
              </p>
            ) : null}
            <ActivityTimeline items={items} />
            {items.length >= limit && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLimit((l) => l + 10)}
                >
                  Show more
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
