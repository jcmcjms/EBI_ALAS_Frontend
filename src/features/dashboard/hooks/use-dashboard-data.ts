import { useQuery } from '@tanstack/react-query'
import { dashboardKeys } from '@/src/features/dashboard/api/dashboard-queries'
import { useSignalRConnectionStore } from '@/src/shared/store/signalr-connection-store'
import { getDashboardOverview } from '../api/dashboard'

export const DASHBOARD_POLL_MS = 30_000

export function dashboardPollInterval(
  isSignalRConnected: boolean,
): number | false {
  return isSignalRConnected ? false : DASHBOARD_POLL_MS
}

export function useDashboardData() {
  const isSignalRConnected = useSignalRConnectionStore((s) => s.isConnected)

  return useQuery({
    queryKey: dashboardKeys.full,
    queryFn: getDashboardOverview,
    refetchInterval: dashboardPollInterval(isSignalRConnected),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}
