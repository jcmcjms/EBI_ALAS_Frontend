import { useState } from 'react'
import { Button } from '@/src/shared/ui/primitives/button'
import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/forms/select'
import { useAccountActivity } from '../hooks/use-account'
import { ActivityTimeline, toTimelineItems } from './activity-timeline'
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
} from './account-states'
import { ACTIVITY_META, type ActivityKind } from '../types'

const ALL_TYPES = 'all'

const KIND_OPTIONS = (Object.keys(ACTIVITY_META) as ActivityKind[]).map(
  (kind) => ({ value: kind, label: ACTIVITY_META[kind].label }),
)

export function ActivityTab() {
  const [limit, setLimit] = useState(10)
  const [kind, setKind] = useState<string>(ALL_TYPES)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const rangeInvalid = Boolean(from && to && from > to)
  const filters = {
    from: from || undefined,
    to: to || undefined,
    action: kind === ALL_TYPES ? undefined : kind,
  }
  const activityQuery = useAccountActivity(limit, rangeInvalid ? {} : filters)
  const items = toTimelineItems(activityQuery.data ?? [])
  const hasFilters = kind !== ALL_TYPES || Boolean(from || to)

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30 py-3">
        <CardTitle className="text-sm">Activity History</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground" htmlFor="activity-type">
              Type
            </Label>
            <Select
              value={kind}
              onValueChange={(v) => {
                setKind(String(v))
                setLimit(10)
              }}
            >
              <SelectTrigger
                id="activity-type"
                className="h-8 w-[150px] bg-background"
              >
                <SelectValue placeholder="All types">
                  {kind === ALL_TYPES
                    ? 'All types'
                    : (ACTIVITY_META[kind as ActivityKind]?.label ?? kind)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES}>All types</SelectItem>
                {KIND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground" htmlFor="activity-from">
              From
            </Label>
            <Input
              id="activity-from"
              type="date"
              className="h-8 w-auto bg-background"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value)
                setLimit(10)
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground" htmlFor="activity-to">
              To
            </Label>
            <Input
              id="activity-to"
              type="date"
              className="h-8 w-auto bg-background"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value)
                setLimit(10)
              }}
            />
          </div>
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKind(ALL_TYPES)
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
          <p role="alert" className="mb-4 text-sm text-destructive">
            Start date must be on or before end date.
          </p>
        ) : null}

        {activityQuery.isLoading ? (
          <ListSkeleton rows={4} />
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
