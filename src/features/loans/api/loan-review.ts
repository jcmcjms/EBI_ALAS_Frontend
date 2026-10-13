import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import {
  unwrapApiData,
  type ApiResponse,
} from '@/src/shared/lib/api/types'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { cancelLoan, pushbackLoan, type LoanResponse } from '@/src/features/loans/api/loans'
import type { LoanStatus } from '@/src/features/loans/model/loan-status'
import { parseQueueDefault } from './queue-default'

// Re-export all types and document operations
export * from './loan-review-types'
export * from './loan-review-documents'

import type {
  LoanDetailResponse,
  LoanRoutingResponse,
  SlaPolicy,
  SyncDisbursementResult,
} from './loan-review-types'
import type {
  CreateRevisionRequestPayload,
  RevisionRequest,
} from '../types/revision-request'

// Real workflow actions live in ./loans — re-exported so review screens
// can import from one place.
export {
  approveLoan,
  cancelLoan,
  evaluateLoan,
  pushbackLoan,
  recommendLoan,
  rejectLoan,
} from '@/src/features/loans/api/loans'

export const loanReviewKeys = {
  detail: (id: number | string) => ['loans', 'review', id, 'detail'] as const,
  history: (id: number | string) => ['loans', 'review', id, 'history'] as const,
  routing: (id: number | string) => ['loans', 'review', id, 'routing'] as const,
  timeline: (id: number | string) => ['loans', 'review', id, 'timeline'] as const,
  checklistDocuments: (id: number | string) =>
    ['loans', 'review', id, 'checklist-documents'] as const,
  documentRemarks: (loanId: number | string) =>
    ['loans', 'review', loanId, 'document-remarks'] as const,
  documentChecklist: (loanId: number | string) =>
    ['loans', 'review', loanId, 'document-checklist'] as const,
  slaPolicy: ['loans', 'sla-policy'] as const,
}

export async function getLoanRouting(id: number | string): Promise<LoanRoutingResponse> {
  const res = await apiClient.get<ApiResponse<LoanRoutingResponse>>(
    `/api/loans/${id}/routing`,
  )
  return unwrapApiData(res.data)
}

/**
 * `GET /api/loans/{id}` returns a bare `LoanResponse` (GUID id).
 * Adapt it to the review-screen detail shape the approval form expects.
 */
export async function getLoanDetail(id: number | string): Promise<LoanDetailResponse> {
  const res = await apiClient.get<LoanResponse>(`/api/loans/${id}`)
  return loanResponseToDetail(res.data)
}

function loanResponseToDetail(loan: LoanResponse): LoanDetailResponse {
  const nameParts = (loan.clientName ?? '').trim().split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] ?? ''
  const lastName = nameParts.slice(1).join(' ') || firstName
  return {
    id: loan.id,
    lamId: loan.lamId,
    applicationGroupNo: loan.applicationGroupNo,
    branchCode: loan.branchId,
    loanNo: loan.productCode ?? '',
    productCode: loan.productCode ?? '',
    product: loan.product || loan.productCode || '',
    creationTypeCode: null,
    creationTypeLabel: loan.loanType === 'Reloan' ? 'Reloan' : 'New Loan',
    requestingOfficer: null,
    lai: null,
    cisId: null,
    firstName: firstName || loan.clientName || '',
    middleName: null,
    lastName,
    suffix: null,
    birthdate: null,
    address: null,
    agency: null,
    position: null,
    employeeId: null,
    netTakeHomePay: null,
    lengthOfService: null,
    region: null,
    divisionCode: null,
    stationCode: null,
    misAgency: null,
    school: null,
    referrer: null,
    purpose: null,
    proposedAmount: loan.principal,
    termDays: loan.termDays,
    interestRate: loan.interestRate,
    policyTermMonths: null,
    approvalTermDays: null,
    annualRatePercent: null,
    cDocStamp: null,
    nthpDate: null,
    notarialFee: 0,
    docStamps: 0,
    insurance: 0,
    standardNotarialFee: 0,
    standardDocStamps: 0,
    standardInsurance: 0,
    verificationFindings: null,
    hasDeviations: false,
    deviationDetails: [],
    deviationJustifications: {},
    remarks: null,
    aoRecommendation: null,
    otherRemarks: null,
    feeDeviationJustification: null,
    status: loan.status,
    applicationDate: loan.createdAt,
    lastActionDate: loan.lastActionDate ?? loan.updatedAt,
    createdById: loan.createdBy,
    createdByName: loan.lastActionByName ?? '',
    actions: [],
    evaluationVerdict: null,
    documentFlag: null,
    outstandingLoans: [],
    buyOuts: [],
    ebiReloans: [],
    incomingLoans: [],
    preLoanId: null,
    preLoanFormNumber: null,
    webLoanPnNumbers: [],
    documentsComplete: null,
    documentsCompleteAt: null,
    assignedApproverName: null,
    requiredApprovalTier: null,
    assignedApproverId: null,
  }
}

export async function getLoanHistory(id: number | string) {
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

/** `POST /api/loans/{id}/cancel` — empty body. Reason is not on the wire. */
export async function cancelLoanApplication(
  id: number | string,
): Promise<LoanResponse> {
  return cancelLoan(id)
}

export async function flagDocuments(
  loanId: number | string,
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

/** `GET /api/loans/sla-policy` → bare `{ recommendationHours, evaluationHours, approvalHours }`. */
export async function getSlaPolicy(): Promise<SlaPolicy> {
  const res = await apiClient.get<SlaPolicy>('/api/loans/sla-policy')
  return res.data
}

export async function getQueueDefault(): Promise<LoanStatus[]> {
  const res = await apiClient.get<unknown>('/api/loans/queue-default')
  return parseQueueDefault(res.data)
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

/**
 * `POST /api/loans/{id}/pushback` with `{ section, comment }` → bare `LoanResponse`.
 * The dialog collects several sections; they are folded into one wire call.
 */
export async function pushbackWithRevision(
  loanId: number | string,
  payload: CreateRevisionRequestPayload,
): Promise<LoanResponse> {
  const section = payload.sections.map((s) => s.sectionId).join(',')
  const comment = [
    ...payload.sections.map((s) => s.comments.trim()).filter(Boolean),
    payload.overallComments.trim(),
  ]
    .filter(Boolean)
    .join('\n')
  return pushbackLoan(loanId, section, comment)
}

export async function getRevisionRequests(
  loanId: number | string,
): Promise<RevisionRequest[]> {
  const res = await apiClient.get<ApiResponse<RevisionRequest[]>>(
    `/api/loans/${loanId}/revision-requests`,
  )
  return unwrapApiData(res.data)
}

export async function resolveRevisionRequest(
  loanId: number | string,
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
    queryKey: loanKeys.queueDefault,
    queryFn: getQueueDefault,
    staleTime: Infinity,
    retry: 1,
  })
}
