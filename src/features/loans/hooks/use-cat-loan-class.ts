import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'

import { getCatLoanClass } from '@/src/features/loans/api/webloans'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'

export function useCatLoanClass(
  bch: string,
  loanNo: string,
  loanProduct: string,
) {
  const branchCode = bch.trim()
  const loanNoTrimmed = loanNo.trim()
  const productCode = loanProduct.trim()
  const enabled = Boolean(branchCode && loanNoTrimmed && productCode)

  return useQuery({
    queryKey: enabled
      ? queryKeys.webLoans.loanClass(branchCode, loanNoTrimmed, productCode)
      : ['webloans', 'loan-class', 'disabled'],
    queryFn: () => getCatLoanClass(branchCode, loanNoTrimmed, productCode),
    enabled,

    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,

    retry: (failureCount, error) => {
      const status = (error as AxiosError)?.response?.status
      if (status === 400 || status === 404) return false
      return failureCount < 2
    },
  })
}
