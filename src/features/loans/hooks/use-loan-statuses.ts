import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import { loanStatusKeys } from '@/src/features/loans/api/loan-queries'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'

const LOAN_STATUSES_STALE_TIME = 60 * 60 * 1000

export interface LoanStatusEntry {
  code: string

  label: string

  isTerminal?: boolean
}

export function useLoanStatuses(): {
  data: LoanStatusEntry[]
  isLoading: boolean
  error: unknown
} {
  const query = useQuery({
    queryKey: loanStatusKeys.list(),
    queryFn: async () => {
      const res =
        await apiClient.get<ApiResponse<LoanStatusEntry[]>>(
          '/api/loan-statuses',
        )
      return unwrapApiData(res.data)
    },
    staleTime: LOAN_STATUSES_STALE_TIME,
  })
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
