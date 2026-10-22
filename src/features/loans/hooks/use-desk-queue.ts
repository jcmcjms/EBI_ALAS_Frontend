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

/**
 * One client's bundle of applications waiting at the desk. The desk serves
 * clients — claiming takes every application in the bundle together.
 */
export interface QueuedClientDto {
  groupNo: string
  clientName: string
  position: number
  isHead: boolean
  ownerUserId: string | null
  ownerName: string | null
  enqueuedAt: string
  applications: QueuedLoanDto[]
}

export interface DeskQueueResponse {
  deskLabel: string
  items: QueuedClientDto[]
  /** First active claim (legacy). Prefer currentClaims. */
  currentClaim: QueuedClientDto | null
  /** Every client bundle this officer currently holds. */
  currentClaims?: QueuedClientDto[]
  scopeDescription: string
}

export interface ClaimApplicationDto {
  loanId: string
  lamId: string
  status: string
}

export interface ClaimResponse {
  /** Primary application to open first. */
  loanId: string
  lamId: string
  clientName: string
  status: string
  leasedAt: string
  groupNo: string
  applications: ClaimApplicationDto[]
}

function bundleSummary(result: ClaimResponse): string {
  const count = result.applications?.length ?? 1
  return count > 1
    ? `Serving ${result.clientName} — ${count} applications in bundle ${result.groupNo}.`
    : `Serving ${result.clientName} — ${result.lamId}.`
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
        toastSuccess(bundleSummary(result))
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
      toastSuccess('Claim released — the client bundle returned to the queue.')
      qc.invalidateQueries({ queryKey: loanKeys.desk })
      qc.invalidateQueries({ queryKey: loanKeys.all })
      qc.invalidateQueries({ queryKey: queryKeys.dashboardRoot })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })
}

export type ClaimByIdResponse = ClaimResponse

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
      toastSuccess(bundleSummary(result))
      qc.invalidateQueries({ queryKey: loanKeys.desk })
      qc.invalidateQueries({ queryKey: loanKeys.all })
      qc.invalidateQueries({ queryKey: queryKeys.dashboardRoot })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })
}
