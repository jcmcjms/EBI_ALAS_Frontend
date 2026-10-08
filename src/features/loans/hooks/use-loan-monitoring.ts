import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import type {
  ApiResponse,
  PagedResult,
} from '@/src/shared/lib/api/types'
import type {
  CreatedLoanSummary,
  LoanSubmissionResponse,
} from '../api/loan-types'
import type {
  LoanMonitoringRecord,
  MonitoringFilters,
  QueueStage,
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

const SORT_COLUMN_MAP: Record<string, string> = {
  applicationDate: 'applicationdate',
  loanAmount: 'proposedamount',
  status: 'status',
  customerName: 'customername',
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toMonitoringRecord(loan: CreatedLoanSummary): LoanMonitoringRecord {
  const nameParts = [
    loan.firstName,
    loan.middleName,
    loan.lastName,
    loan.suffix,
  ].filter((part): part is string => Boolean(part))

  const appliedAt = parseDate(loan.applicationDate)
  const lastActionAt = parseDate(loan.lastActionDate) ?? appliedAt ?? new Date()

  return {
    id: loan.id,
    formNumber: loan.lamId,
    branchCode: loan.branchCode ?? '—',
    customerName: nameParts.join(' ') || 'Unknown client',
    loanType: loan.creationTypeLabel ?? 'New Loan',
    product: loan.product ?? loan.productCode,
    loanAmount: loan.proposedAmount,
    applicationDate: (appliedAt ?? new Date()).toISOString(),
    status: (loan.status as LoanStatus) ?? 'Draft',
    lastActionDate: lastActionAt.toISOString(),
    timeLapsedHours: Math.max(
      0,
      Math.round((Date.now() - lastActionAt.getTime()) / 3_600_000),
    ),

    lastActionBy: loan.lastActionByName ?? loan.createdByName ?? '—',
    lastActionVerb: loan.lastAction ?? null,
    createdById: loan.createdById ?? null,

    documentsComplete: loan.documentsComplete ?? null,
    documentsCompleteAt: loan.documentsCompleteAt ?? null,
    assignedApproverName: loan.assignedApproverName ?? null,
    requiredApprovalTier: loan.requiredApprovalTier ?? null,

    queueStage: (loan.queueStage as QueueStage) ?? null,
    queuePosition: loan.queuePosition ?? null,
    queueLength: loan.queueLength ?? null,
    queueOwnerName: loan.queueOwnerName ?? null,
    isQueueHead: loan.isQueueHead ?? false,
    documentFlag: loan.documentFlag ?? null,
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
        const backendSortId = SORT_COLUMN_MAP[sorting[0].id]
        if (backendSortId) {
          params.sortBy = backendSortId
          params.sortDesc = String(sorting[0].desc)
        }
      }

      const { data: envelope } = await apiClient.get<
        ApiResponse<PagedResult<LoanSubmissionResponse>>
      >('/api/loans', { params })

      if (!envelope.success || !envelope.data) {
        throw new Error(envelope.message || 'Loan monitoring request failed')
      }

      const page = envelope.data

      const records = page.items.flatMap((group) =>
        (group.loans ?? []).map(toMonitoringRecord),
      )

      return { records, rowCount: page.totalCount }
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
