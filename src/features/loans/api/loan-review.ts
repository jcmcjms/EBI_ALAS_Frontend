import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import {
  unwrapApiData,
  type ApiResponse,
} from '@/src/shared/lib/api/types'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'
import type { LoanStatus } from '@/src/features/loans/utils/loan-status'
import { LOAN_STATUS_META } from '@/src/features/loans/utils/loan-status'

// Re-export all types and document operations
export * from './loan-review-types'
export * from './loan-review-documents'

import type {
  LoanDetailResponse,
  LoanRoutingResponse,
  UpdateStatusPayload,
  SyncDisbursementResult,
} from './loan-review-types'
import type {
  CreateRevisionRequestPayload,
  RevisionRequest,
} from '../types/revision-request'

export const loanReviewKeys = {
  detail: (id: number) => ['loans', 'review', id, 'detail'] as const,
  history: (id: number) => ['loans', 'review', id, 'history'] as const,
  routing: (id: number) => ['loans', 'review', id, 'routing'] as const,
  timeline: (id: number) => ['loans', 'review', id, 'timeline'] as const,
  checklistDocuments: (id: number) =>
    ['loans', 'review', id, 'checklist-documents'] as const,
  documentRemarks: (loanId: number) =>
    ['loans', 'review', loanId, 'document-remarks'] as const,
  documentChecklist: (loanId: number) =>
    ['loans', 'review', loanId, 'document-checklist'] as const,
  slaPolicy: ['loans', 'sla-policy'] as const,
}

export async function getLoanRouting(id: number): Promise<LoanRoutingResponse> {
  const res = await apiClient.get<ApiResponse<LoanRoutingResponse>>(
    `/api/loans/${id}/routing`,
  )
  return unwrapApiData(res.data)
}

export async function getLoanDetail(id: number): Promise<LoanDetailResponse> {
  const res = await apiClient.get<ApiResponse<LoanDetailResponse>>(
    `/api/loans/${id}`,
  )
  return unwrapApiData(res.data)
}

export async function getLoanHistory(id: number) {
  const res = await apiClient.get<
    ApiResponse<
      {
        id: number
        actionBy: string
        action: string
        fromStatus: string | null
        toStatus: string | null
        comments: string | null
        actionDate: string
      }[]
    >
  >(`/api/loans/${id}/history`)
  return unwrapApiData(res.data)
}

export async function updateLoanStatus(
  id: number,
  payload: UpdateStatusPayload,
): Promise<void> {
  const res = await apiClient.put<ApiResponse<null>>(
    `/api/loans/${id}/status`,
    payload,
  )
  if (!res.data.success)
    throw new Error(res.data.message || 'Failed to update status')
}

export async function cancelLoanApplication(
  id: number,
  reason: string,
): Promise<void> {
  const res = await apiClient.post<ApiResponse<null>>(
    `/api/loans/${id}/cancel`,
    { reason },
  )
  if (!res.data.success)
    throw new Error(res.data.message || 'Failed to cancel application')
}

export async function flagDocuments(
  loanId: number,
  payload: { missingRequirementCodes: string[]; reason: string },
): Promise<void> {
  const res = await apiClient.post<ApiResponse<null>>(
    `/api/loans/${loanId}/document-flag`,
    payload,
  )
  if (!res.data.success)
    throw new Error(res.data.message || 'Failed to flag documents')
}

export async function clearDocumentFlag(loanId: number): Promise<void> {
  const res = await apiClient.delete<ApiResponse<null>>(
    `/api/loans/${loanId}/document-flag`,
  )
  if (!res.data.success)
    throw new Error(res.data.message || 'Failed to clear document flag')
}

export async function getSlaPolicy(): Promise<Record<string, number>> {
  const res = await apiClient.get<ApiResponse<Record<string, number>>>(
    '/api/loans/sla-policy',
  )
  return unwrapApiData(res.data)
}

export async function getQueueDefault(): Promise<LoanStatus[]> {
  const res = await apiClient.get<ApiResponse<string[]>>(
    '/api/loans/queue-default',
  )
  return unwrapApiData(res.data).filter(
    (s): s is LoanStatus => s in LOAN_STATUS_META,
  )
}

export async function syncDisbursementStatus(
  loanNo: string,
): Promise<SyncDisbursementResult> {
  const res = await apiClient.post<ApiResponse<SyncDisbursementResult>>(
    `/api/loans/sync-disbursement-status`,
    null,
    { params: { loanNo } },
  )
  if (!res.data.success)
    throw new Error(res.data.message || 'Failed to sync disbursement status')
  return res.data.data!
}

export async function pushbackWithRevision(
  loanId: number,
  payload: CreateRevisionRequestPayload,
): Promise<RevisionRequest> {
  const res = await apiClient.post<ApiResponse<RevisionRequest>>(
    `/api/loans/${loanId}/pushback`,
    payload,
  )
  if (!res.data.success)
    throw new Error(res.data.message || 'Failed to push back application')
  return unwrapApiData(res.data)
}

export async function getRevisionRequests(
  loanId: number,
): Promise<RevisionRequest[]> {
  const res = await apiClient.get<ApiResponse<RevisionRequest[]>>(
    `/api/loans/${loanId}/revision-requests`,
  )
  return unwrapApiData(res.data)
}

export async function resolveRevisionRequest(
  loanId: number,
  revisionId: number,
): Promise<void> {
  const res = await apiClient.put<ApiResponse<null>>(
    `/api/loans/${loanId}/revision-requests/${revisionId}/resolve`,
  )
  if (!res.data.success)
    throw new Error(res.data.message || 'Failed to resolve revision request')
}

export function useSlaPolicy() {
  return useQuery({
    queryKey: loanReviewKeys.slaPolicy,
    queryFn: getSlaPolicy,
    staleTime: Infinity,
    retry: 1,
  })
}

export function useQueueDefault() {
  return useQuery({
    queryKey: queryKeys.loans.queueDefault,
    queryFn: getQueueDefault,
    staleTime: Infinity,
    retry: 1,
  })
}