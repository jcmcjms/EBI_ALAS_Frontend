import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import type { LoanProductResponse } from '@/src/shared/lib/api/types'

export const loanProductKeys = {
  all: ['loan-products'] as const,
  list: (params: { isActive?: boolean; code?: string } = {}) =>
    ['loan-products', 'list', params] as const,
  detail: (code: string) => ['loan-products', 'detail', code] as const,
}

export async function getLoanProducts(): Promise<LoanProductResponse[]> {
  
  
  const items: LoanProductResponse[] = []
  const pageSize = 100
  let page = 1

  for (;;) {
    const res = await apiClient.get<
      | { items: LoanProductResponse[]; totalCount: number }
      | LoanProductResponse[]
    >('/api/loan-products', { params: { page, pageSize } })

    if (Array.isArray(res.data)) {
      return res.data
    }

    const batch = res.data.items ?? []
    items.push(...batch)

    const total = res.data.totalCount ?? items.length
    if (batch.length === 0 || items.length >= total) {
      return items
    }

    page += 1
  }
}

export async function getLoanProductByCode(
  code: string,
): Promise<LoanProductResponse | null> {
  const products = await getLoanProducts()
  return products.find((p) => p.code?.toUpperCase() === code.trim().toUpperCase()) ?? null
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
    enabled: code !== null && code.trim().length > 0,
    staleTime: LOAN_PRODUCTS_STALE_TIME,
  })
}
