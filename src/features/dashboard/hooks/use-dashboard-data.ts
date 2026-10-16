import { useQuery } from '@tanstack/react-query'
import { dashboardKeys } from '@/src/features/dashboard/api/dashboard-queries'
import { useSignalRConnectionStore } from '@/src/shared/store/signalr-connection-store'
import { getDashboardOverview, manilaTodayIso } from '../api/dashboard'

export const DASHBOARD_POLL_MS = 300_000

export function dashboardPollInterval(
  isSignalRConnected: boolean,
): number | false {
  return isSignalRConnected ? false : DASHBOARD_POLL_MS
}

export function useDashboardData(date?: string) {
  const isSignalRConnected = useSignalRConnectionStore((s) => s.isConnected)
  const asOfDay = date ?? manilaTodayIso()

  return useQuery({
    queryKey: [...dashboardKeys.full, asOfDay],
    queryFn: () => getDashboardOverview(asOfDay),
    refetchInterval: dashboardPollInterval(isSignalRConnected),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}
