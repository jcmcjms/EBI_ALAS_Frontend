import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/lib/apiClient'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'
import { unwrapApiData, type ApiResponse } from '@/src/lib/api/types'

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
    queryKey: queryKeys.loanStatuses.list(),
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
