import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getErrorMessage } from '@/src/shared/lib/apiClient'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'
import { toastError, toastSuccess, toastInfo } from '@/src/shared/ui/feedback/toast'

export interface QueuedLoanDto {
  loanId: string
  lamId: string
  clientName: string
  position: number
  isHead: boolean
  ownerUserId: string | null
  ownerName: string | null
  enqueuedAt: string
  status: string
  branchCode: string
  productCode: string
  product: string
  loanType: string | null
  purpose: string | null
  proposedAmount: number
  termDays: number
  applicationDate: string
  hasDeviations: boolean
}

export interface DeskQueueResponse {
  deskLabel: string
  items: QueuedLoanDto[]
  currentClaim: QueuedLoanDto | null
  scopeDescription: string
}

export interface ClaimResponse {
  loanId: string
  lamId: string
  clientName: string
  status: string
  leasedAt: string
}

export function useDeskQueue() {
  return useQuery({
    queryKey: loanKeys.desk,
    queryFn: async (): Promise<DeskQueueResponse> => {
      const { data } = await apiClient.get<DeskQueueResponse>(
        '/api/loans/queue/my',
      )
      return data
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useClaimNext() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<ClaimResponse | null> => {
      const { data } = await apiClient.post<ClaimResponse | null>(
        '/api/loans/queue/claim',
      )
      return data
    },
    onSuccess: (result) => {
      if (result) {
        toastSuccess(`Serving ${result.lamId} — ${result.clientName}.`)
      } else {
        toastInfo('Queue is clear — nothing to serve.')
      }
      qc.invalidateQueries({ queryKey: loanKeys.desk })
      qc.invalidateQueries({ queryKey: loanKeys.all })
      qc.invalidateQueries({ queryKey: queryKeys.dashboardRoot })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })
}

export function useReleaseClaim() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.post('/api/loans/queue/release')
    },
    onSuccess: () => {
      toastSuccess('Claim released — file returned to the queue.')
      qc.invalidateQueries({ queryKey: loanKeys.desk })
      qc.invalidateQueries({ queryKey: loanKeys.all })
      qc.invalidateQueries({ queryKey: queryKeys.dashboardRoot })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })
}

export interface ClaimByIdResponse {
  loanId: string
  lamId: string
  clientName: string
  status: string
  leasedAt: string
}

export function useClaimById() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (loanId: string | number): Promise<ClaimByIdResponse> => {
      const { data } = await apiClient.post<ClaimByIdResponse>(
        `/api/loans/queue/${loanId}/claim`,
      )
      return data
    },
    onSuccess: (result) => {
      toastSuccess(`Serving ${result.lamId} — ${result.clientName}.`)
      qc.invalidateQueries({ queryKey: loanKeys.desk })
      qc.invalidateQueries({ queryKey: loanKeys.all })
      qc.invalidateQueries({ queryKey: queryKeys.dashboardRoot })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })
}
