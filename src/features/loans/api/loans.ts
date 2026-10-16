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
  LoanSubmissionPayload,
  LoanResponse,
} from './loan-types'
import type {
  LoanSubmissionResult,
  SubmitLoanApplicationsRequest,
} from './loan-submit'

export type {
  LoanSubmissionPayload,
  CreatedLoanSummary,
  LoanResponse,
}


export interface ListLoansParams {
  page: number
  pageSize: number
  
  status?: string
  branchId?: string
  branchCode?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  myTurn?: boolean | string
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


export async function submitLoan(
  request: SubmitLoanApplicationsRequest,
): Promise<LoanSubmissionResult> {
  const res = await apiClient.post<LoanSubmissionResult>('/api/loans', request)
  return res.data
}

export async function submitLoanApplication(
  payload: LoanSubmissionPayload,
  idempotencyKey: string,
): Promise<LoanSubmissionResult> {
  const res = await apiClient.post<ApiResponse<LoanSubmissionResult>>(
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
  ): Promise<LoanSubmissionResult> =>
    submitLoanApplication(payload, idempotencyKey),
}

export async function createLoan(
  payload: LoanSubmissionPayload,
  idempotencyKey: string,
): Promise<LoanSubmissionResult> {
  const res = await apiClient.post<ApiResponse<LoanSubmissionResult>>(
    '/api/loans',
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
  return unwrapApiData(res.data)
}


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
        search: params.search || undefined,
        dateFrom: params.dateFrom || undefined,
        dateTo: params.dateTo || undefined,
        myTurn: params.myTurn || undefined,
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


export async function getLoanById(id: number | string): Promise<LoanResponse> {
  const res = await apiClient.get<LoanResponse>(`/api/loans/${id}`)
  return res.data
}


export async function getLoanByLamId(lamId: string): Promise<LoanResponse> {
  const res = await apiClient.get<LoanResponse>(
    `/api/loans/lam/${encodeURIComponent(lamId)}`,
  )
  return res.data
}




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
