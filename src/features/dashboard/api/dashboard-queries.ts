import { queryKeys } from '@/src/shared/lib/query/queryKeys'

export const dashboardKeys = {
  /** Root of the dashboard cache family; invalidates every dashboard query. */
  full: queryKeys.dashboardRoot,
  summary: ['dashboard', 'summary'] as const,
} as const
