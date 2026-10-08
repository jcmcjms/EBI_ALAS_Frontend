import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { dashboardKeys } from '@/src/features/dashboard/api/dashboard-queries'

export function useDashboardRealtime(
  getConnection: () => import('@microsoft/signalr').HubConnection | null,
) {
  const qc = useQueryClient()

  useEffect(() => {
    const conn = getConnection()
    if (!conn) return

    const onDashboardUpdated = () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.full })
      qc.invalidateQueries({ queryKey: dashboardKeys.summary })
    }

    conn.on('DashboardUpdated', onDashboardUpdated)

    return () => {
      conn.off('DashboardUpdated', onDashboardUpdated)
    }
  }, [getConnection, qc])
}
