import { useQuery } from '@tanstack/react-query'
import { dashboardKeys } from '@/src/features/dashboard/api/dashboard-queries'
import { getDashboardOverview } from '../api/dashboard'

export function useDashboardData() {
  return useQuery({
    queryKey: dashboardKeys.full,
    queryFn: getDashboardOverview,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}
