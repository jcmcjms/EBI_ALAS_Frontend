import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import type { PagedResult } from '@/src/shared/lib/api/types'
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

/** Raw row from GET /api/loans (no ApiResponse envelope). */
interface BackendLoanListItem {
  id: string
  lamId: string
  applicationGroupNo: string
  clientName: string
  branchId: string
  loanType: string
  status: string
  principal: number
  termDays: number
  interestRate: number
  totalInterest: number
  totalDeductions: number
  netProceeds: number
  createdAt: string
}

function toMonitoringRecord(loan: BackendLoanListItem): LoanMonitoringRecord {
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
  sorting: SortingState[],
) {
  const query = useQuery({
    queryKey: loanKeys.monitoring(filters, pagination, sorting),
    queryFn: async (): Promise<{
      records: LoanMonitoringRecord[]
      rowCount: number
    }> => {
      const params: Record<string, string> = {
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
      }

      if (filters.search) params.search = filters.search

      if (filters.status.length > 0) {
        params.status = filters.status.join(',')
      }

      if (filters.branchCode && filters.branchCode !== 'all') {
        params.branchCode = filters.branchCode
      }

      if (filters.dateRange.from)
        params.fromDate = filters.dateRange.from.toISOString()
      if (filters.dateRange.to)
        params.toDate = filters.dateRange.to.toISOString()

      if (filters.myTurn) params.myTurn = 'true'

      if (sorting.length > 0) {
        params.sortBy = sorting[0].id
        params.sortDesc = String(sorting[0].desc)
      }

      const { data: page } = await apiClient.get<
        PagedResult<BackendLoanListItem>
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
