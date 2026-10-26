import { memo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Badge } from '@/src/shared/ui/primitives/badge'
import type { DashboardSummary as DashboardSummaryType } from '../types'

interface DashboardSummaryProps {
  data: DashboardSummaryType
  asOfDay?: string
  isToday?: boolean
}

export const DashboardSummary = memo(function DashboardSummary({
  data,
  asOfDay,
  isToday = true,
}: DashboardSummaryProps) {
  const pendingContext =
    data.pendingDeltaFromYesterday === 0
      ? 'No change from yesterday'
      : `${data.pendingDeltaFromYesterday > 0 ? '+' : ''}${data.pendingDeltaFromYesterday} from yesterday`

  const approvedContext =
    data.approvedVsAvgPercent === 0
      ? 'No change vs 7-day average'
      : `${data.approvedVsAvgPercent > 0 ? '+' : ''}${data.approvedVsAvgPercent}% vs 7-day average`

  const dayLabel = isToday
    ? 'Today'
    : asOfDay
      ? `on ${asOfDay}`
      : 'on selected day'

  const stats = [
    {
      label: 'Pending applications',
      value: data.totalPending,
      context: pendingContext,
      isAlert: false,
    },
    {
      label: 'In progress',
      value: data.nowServing,
      context: 'Currently being reviewed',
      isAlert: false,
    },
    {
      label: `Returned ${dayLabel}`,
      value: data.pushBacksToday,
      context:
        data.pushBacksToday > 0
          ? 'Requires correction'
          : 'No corrections needed',
      isAlert: data.pushBacksToday > 0,
    },
    {
      label: `Approved ${dayLabel}`,
      value: data.approvedToday,
      context: approvedContext,
      isAlert: false,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-3xl font-bold tabular-nums tracking-tight">
                {stat.value}
              </span>
              {stat.isAlert && (
                <Badge
                  variant="destructive"
                  className="h-4 px-1.5 py-0 text-[10px] font-medium"
                >
                  Action
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stat.context}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
})
