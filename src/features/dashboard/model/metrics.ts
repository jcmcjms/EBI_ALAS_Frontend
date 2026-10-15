import type { DashboardSummary } from '../types'

export function pendingApplications(summary: DashboardSummary): number {
  return summary.totalPending
}

export function underReview(summary: DashboardSummary): number {
  return summary.nowServing
}

export function returnedToday(summary: DashboardSummary): number {
  return summary.pushBacksToday
}

export function approvedToday(summary: DashboardSummary): number {
  return summary.approvedToday
}

export function formatComparison(
  suffix: string,
  delta: number | null | undefined,
): string {
  if (delta == null) return ''
  if (delta === 0) return `No change ${suffix}`
  return `${delta > 0 ? '+' : ''}${delta} ${suffix}`
}
