import type { WeeklyTrendPoint, WeeklyTrendSummary } from '../types'

export function shouldShowWeeklyChart(points: WeeklyTrendPoint[]): boolean {
  const activeDays = points.filter((p) => p.approved > 0 || p.pushBacks > 0)
  return activeDays.length >= 2
}

export function summarizeWeeklyTrend(
  points: WeeklyTrendPoint[],
): WeeklyTrendSummary {
  return points.reduce(
    (acc, p) => ({
      approved: acc.approved + p.approved,
      returned: acc.returned + p.pushBacks,
    }),
    { approved: 0, returned: 0 },
  )
}
