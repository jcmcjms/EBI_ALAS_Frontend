import { apiClient } from '@/src/lib/apiClient'
import {
  unwrapApiData,
  type ActiveLoansResponse,
  type ApiResponse,
  type CatLoanClassResponse,
  type CocreeStatusResponse,
  type OutstandingLoansResponse,
  type PendingLoanResponse,
  type PreLoansQuery,
  type PreLoansResponse,
  type WebLoanCisSearchResponse,
} from '@/src/lib/api/types'

export async function getWebLoanByCis(
  cisNo: string,
): Promise<WebLoanCisSearchResponse> {
  const res = await apiClient.get<ApiResponse<WebLoanCisSearchResponse>>(
    `/api/webloans/cis/${encodeURIComponent(cisNo)}/search`,
  )
  return unwrapApiData(res.data)
}

export async function getActiveLoansByAccount(
  cisNo: string,
  accountNo: string,
): Promise<ActiveLoansResponse> {
  const res = await apiClient.get<ApiResponse<ActiveLoansResponse>>(
    `/api/webloans/cis/${encodeURIComponent(cisNo)}/accounts/${encodeURIComponent(accountNo)}/active-loans`,
  )
  return unwrapApiData(res.data)
}

export async function getOutstandingLoans(
  cisNo: string,
  accountId: string,
): Promise<OutstandingLoansResponse> {
  const res = await apiClient.get<ApiResponse<OutstandingLoansResponse>>(
    `/api/webloans/cis/${encodeURIComponent(cisNo)}/accounts/${encodeURIComponent(accountId)}/outstanding-loans`,
  )
  return unwrapApiData(res.data)
}

export async function getPreLoans(
  query: PreLoansQuery,
): Promise<PreLoansResponse> {
  const res = await apiClient.get<ApiResponse<PreLoansResponse>>(
    '/api/preloans',
    { params: query },
  )
  return unwrapApiData(res.data)
}

export async function getPendingLoan(
  cisNo: string,
  accountId: string,
): Promise<PendingLoanResponse> {
  const res = await apiClient.get<ApiResponse<PendingLoanResponse>>(
    `/api/webloans/cis/${encodeURIComponent(cisNo)}/accounts/${encodeURIComponent(accountId)}/pending-loan`,
  )
  return unwrapApiData(res.data)
}

export async function getCatLoanClass(
  bch: string,
  loanNo: string,
  loanProduct: string,
): Promise<CatLoanClassResponse> {
  const res = await apiClient.get<ApiResponse<CatLoanClassResponse>>(
    '/api/webloans/loan-class',
    { params: { bch, loanNo, loanProduct } },
  )
  return unwrapApiData(res.data)
}

export async function getCocreeStatus(
  cisNo: string,
): Promise<CocreeStatusResponse> {
  const res = await apiClient.get<ApiResponse<CocreeStatusResponse>>(
    `/api/webloans/cis/${encodeURIComponent(cisNo)}/cocree-status`,
  )
  return unwrapApiData(res.data)
}
