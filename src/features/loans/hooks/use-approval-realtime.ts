import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEscalationStore } from '@/src/features/loans/store/escalationStore'
import { loanKeys } from '@/src/features/loans/api/loan-queries'

export function useApprovalRealtime(
  getConnection: () => import('@microsoft/signalr').HubConnection | null,
) {
  const qc = useQueryClient()
  const markEscalated = useEscalationStore((s) => s.markEscalated)

  useEffect(() => {
    const conn = getConnection()
    if (!conn) return

    const onAssigned = (
      payload: { loanId?: number; escalated?: boolean } | undefined,
    ) => {
      if (payload?.escalated && payload.loanId) {
        markEscalated(payload.loanId)
      }

      qc.invalidateQueries({ queryKey: ['loans'] })
    }

    const onDashboardUpdated = () => {
      qc.invalidateQueries({ queryKey: loanKeys.desk })
    }

    conn.on('LoanAssigned', onAssigned)
    conn.on('DashboardUpdated', onDashboardUpdated)

    return () => {
      conn.off('LoanAssigned', onAssigned)
      conn.off('DashboardUpdated', onDashboardUpdated)
    }
  }, [getConnection, qc, markEscalated])
}
