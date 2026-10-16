import { queryKeys } from '@/src/shared/lib/query/queryKeys'

export const dashboardKeys = {
  
  full: queryKeys.dashboardRoot,
  summary: ['dashboard', 'summary'] as const,
} as const
