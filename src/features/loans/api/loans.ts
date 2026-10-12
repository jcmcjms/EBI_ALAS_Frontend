import { apiClient } from '@/src/shared/lib/apiClient'
import {
  mapPageResult,
  unwrapApiData,
  type ApiResponse,
  type BackendPageResult,
  type PagedResult,
} from '@/src/shared/lib/api/types'
import type {
  CreatedLoanSummary,
  LoanResponse,
  LoanSubmissionPayload,
  LoanSubmissionResponse,
} from './loan-types'
import type { SubmitLoanRequest } from './loan-submit'

export type {
  LoanSubmissionPayload,
  CreatedLoanSummary,
  LoanSubmissionResponse,
  LoanResponse,
}

/**
 * Query params actually supported by `GET /api/loans`.
 * Wire uses `page` (1-based) — not `pageNumber`. No search/date/sort filters.
 */
export interface ListLoansParams {
  page: number
  pageSize: number
  /** Comma-separated PascalCase `LoanStatus` names. */
  status?: string
  branchId?: string
  branchCode?: string
}

export interface LoanHistoryEntry {
  id: number
  actionBy: string
  action: string
  fromStatus?: string
  toStatus?: string
  comments?: string
  actionDate: string
  actionByRole: string
}

/** `POST /api/loans` — bare `LoanResponse` (201), no `ApiResponse` envelope. */
export async function submitLoan(
  request: SubmitLoanRequest,
): Promise<LoanResponse> {
  const res = await apiClient.post<LoanResponse>('/api/loans', request)
  return res.data
}

export async function submitLoanApplication(
  payload: LoanSubmissionPayload,
  idempotencyKey: string,
): Promise<LoanSubmissionResponse> {
  const res = await apiClient.post<ApiResponse<LoanSubmissionResponse>>(
    '/api/loans',
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
  return unwrapApiData(res.data)
}

export const loanApi = {
  createLoan: (
    payload: LoanSubmissionPayload,
    idempotencyKey: string,
  ): Promise<LoanSubmissionResponse> =>
    submitLoanApplication(payload, idempotencyKey),
}

export async function createLoan(
  payload: LoanSubmissionPayload,
  idempotencyKey: string,
): Promise<LoanSubmissionResponse> {
  const res = await apiClient.post<ApiResponse<LoanSubmissionResponse>>(
    '/api/loans',
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
  return unwrapApiData(res.data)
}

/**
 * `GET /api/loans?page&pageSize&status&branchId|branchCode`
 * → bare `BackendPageResult<LoanResponse>` on the wire; mapped for the UI.
 */
export async function listLoans(
  params: ListLoansParams,
): Promise<PagedResult<LoanResponse>> {
  const res = await apiClient.get<BackendPageResult<LoanResponse>>(
    '/api/loans',
    {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        status: params.status || undefined,
        branchId: params.branchId || undefined,
        branchCode: params.branchCode || undefined,
      },
    },
  )
  return mapPageResult(res.data)
}

export async function getLoanHistory(
  applicationId: number,
): Promise<LoanHistoryEntry[]> {
  const res = await apiClient.get<ApiResponse<LoanHistoryEntry[]>>(
    `/api/loans/${applicationId}/history`,
  )
  return unwrapApiData(res.data)
}

/** `GET /api/loans/{id}` → bare `LoanResponse` (not the review-screen detail). */
export async function getLoanById(id: number | string): Promise<LoanResponse> {
  const res = await apiClient.get<LoanResponse>(`/api/loans/${id}`)
  return res.data
}

/** `GET /api/loans/lam/{lamId}` → bare `LoanResponse`. */
export async function getLoanByLamId(lamId: string): Promise<LoanResponse> {
  const res = await apiClient.get<LoanResponse>(
    `/api/loans/lam/${encodeURIComponent(lamId)}`,
  )
  return res.data
}

// ── Workflow actions (auth + CSRF) ─────────────────────────────────
// Each returns the updated bare `LoanResponse`.

export async function recommendLoan(id: number | string): Promise<LoanResponse> {
  const res = await apiClient.post<LoanResponse>(`/api/loans/${id}/recommend`)
  return res.data
}

export async function evaluateLoan(
  id: number | string,
  recommend: boolean,
): Promise<LoanResponse> {
  const res = await apiClient.post<LoanResponse>(`/api/loans/${id}/evaluate`, {
    recommend,
  })
  return res.data
}

export async function approveLoan(id: number | string): Promise<LoanResponse> {
  const res = await apiClient.post<LoanResponse>(`/api/loans/${id}/approve`)
  return res.data
}

export async function rejectLoan(id: number | string): Promise<LoanResponse> {
  const res = await apiClient.post<LoanResponse>(`/api/loans/${id}/reject`)
  return res.data
}

export async function pushbackLoan(
  id: number | string,
  section: string,
  comment: string,
): Promise<LoanResponse> {
  const res = await apiClient.post<LoanResponse>(`/api/loans/${id}/pushback`, {
    section,
    comment,
  })
  return res.data
}

export async function cancelLoan(id: number | string): Promise<LoanResponse> {
  const res = await apiClient.post<LoanResponse>(`/api/loans/${id}/cancel`)
  return res.data
}
