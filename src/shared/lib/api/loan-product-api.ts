import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'
import type { LoanProductResponse } from '@/src/shared/lib/api/types'

export const loanProductKeys = {
  all: ['loan-products'] as const,
  list: (params: { isActive?: boolean; code?: string } = {}) =>
    ['loan-products', 'list', params] as const,
  detail: (code: string) => ['loan-products', 'detail', code] as const,
}

export async function getLoanProducts(): Promise<LoanProductResponse[]> {
  const res = await apiClient.get<ApiResponse<LoanProductResponse[]>>(
    '/api/loan-products',
  )
  return unwrapApiData(res.data)
}

export async function getLoanProductByCode(
  code: string,
): Promise<LoanProductResponse> {
  const res = await apiClient.get<ApiResponse<LoanProductResponse>>(
    `/api/loan-products/${code}`,
  )
  return unwrapApiData(res.data)
}

const LOAN_PRODUCTS_STALE_TIME = 5 * 60_000

export function useLoanProducts() {
  return useQuery({
    queryKey: loanProductKeys.list(),
    queryFn: getLoanProducts,
    staleTime: LOAN_PRODUCTS_STALE_TIME,
  })
}

export function useLoanProduct(code: string | null) {
  return useQuery({
    queryKey:
      code !== null
        ? loanProductKeys.detail(code)
        : ['loan-products', 'detail', 'disabled'],
    queryFn: () => getLoanProductByCode(code!),
    enabled: code !== null,
    staleTime: LOAN_PRODUCTS_STALE_TIME,
  })
}