import { Button } from '@/src/shared/ui/primitives/button'
import {
  approvedToday,
  formatComparison,
  pendingApplications,
  returnedToday,
  underReview,
} from '../model/metrics'
import type { DashboardSummary } from '../types'

export type MetricTarget = 'pending' | 'under-review' | 'returned' | 'approved'

interface MetricStripProps {
  summary: DashboardSummary
  onNavigate: (target: MetricTarget) => void
}

export function MetricStrip({ summary, onNavigate }: MetricStripProps) {
  const metrics: Array<{
    key: MetricTarget
    label: string
    value: number
    support: string
  }> = [
    {
      key: 'pending',
      label: 'Pending Applications',
      value: pendingApplications(summary),
      support: formatComparison(
        'from yesterday',
        summary.pendingDeltaFromYesterday,
      ),
    },
    {
      key: 'under-review',
      label: 'Under Review',
      value: underReview(summary),
      support: 'Active reviewers (last 60 min)',
    },
    {
      key: 'returned',
      label: 'Returned Today',
      value: returnedToday(summary),
      support: returnedToday(summary) > 0 ? 'Needs correction' : 'None today',
    },
    {
      key: 'approved',
      label: 'Approved Today',
      value: approvedToday(summary),
      support:
        summary.approvedVsAvgPercent === 0
          ? 'No change vs 7-day avg'
          : `${summary.approvedVsAvgPercent > 0 ? '+' : ''}${summary.approvedVsAvgPercent}% vs 7-day avg`,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => (
        <Button
          key={m.key}
          type="button"
          variant="outline"
          className="h-auto flex-col items-start gap-1 p-4 text-left"
          onClick={() => onNavigate(m.key)}
          aria-label={`${m.label}: ${m.value}. ${m.support}`}
        >
          <span className="text-xs font-medium text-muted-foreground">
            {m.label}
          </span>
          <span className="text-3xl font-semibold tabular-nums text-foreground">
            {m.value}
          </span>
          <span className="text-xs text-muted-foreground">{m.support}</span>
        </Button>
      ))}
    </div>
  )
}
