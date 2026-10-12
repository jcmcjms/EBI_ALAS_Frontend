import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import type { BackendPageResult } from '@/src/shared/lib/api/types'
import type { LoanResponse } from '@/src/features/loans/api/loan-types'
import type {
  LoanMonitoringRecord,
  MonitoringFilters,
} from '@/src/features/loans/types/monitoring'
import type { LoanStatus } from '@/src/features/loans/model/loan-status'

interface PaginationState {
  pageIndex: number
  pageSize: number
}
interface SortingState {
  id: string
  desc: boolean
}

function toMonitoringRecord(loan: LoanResponse): LoanMonitoringRecord {
  const appliedAt = new Date(loan.createdAt)

  return {
    id: loan.id,
    formNumber: loan.lamId,
    branchCode: loan.branchId,
    customerName: loan.clientName || 'Unknown client',
    loanType: loan.loanType === 'Reloan' ? 'Reloan' : 'New Loan',
    product: '—',
    loanAmount: loan.principal,
    applicationDate: appliedAt.toISOString(),
    status: (loan.status as LoanStatus) ?? 'Draft',
    lastActionDate: appliedAt.toISOString(),
    timeLapsedHours: Math.max(
      0,
      Math.round((Date.now() - appliedAt.getTime()) / 3_600_000),
    ),
    lastActionBy: '—',
    lastActionVerb: null,
    createdById: null,
    documentsComplete: null,
    documentsCompleteAt: null,
    assignedApproverName: null,
    requiredApprovalTier: null,
    queueStage: null,
    queuePosition: null,
    queueLength: null,
    queueOwnerName: null,
    isQueueHead: false,
    documentFlag: null,
    noAuthorityReason: null,
  }
}

export function useLoanMonitoring(
  filters: MonitoringFilters,
  pagination: PaginationState,
  _sorting: SortingState[],
) {
  const query = useQuery({
    queryKey: loanKeys.monitoring(filters, pagination, _sorting),
    queryFn: async (): Promise<{
      records: LoanMonitoringRecord[]
      rowCount: number
    }> => {
      // GET /api/loans supports page, pageSize, status, branchId|branchCode only.
      const params: Record<string, string> = {
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
      }

      if (filters.status.length > 0) {
        params.status = filters.status.join(',')
      }

      if (filters.branchCode && filters.branchCode !== 'all') {
        params.branchCode = filters.branchCode
      }

      const { data: page } = await apiClient.get<
        BackendPageResult<LoanResponse>
      >('/api/loans', { params })

      return {
        records: page.items.map(toMonitoringRecord),
        rowCount: page.totalCount,
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
  })

  return {
    ...query,
    data: query.data?.records ?? [],
    rowCount: query.data?.rowCount ?? 0,
  }
}
