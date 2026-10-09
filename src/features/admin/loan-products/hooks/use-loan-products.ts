import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loanProductKeys } from '@/src/features/admin/loan-products/api/loan-product-queries'
import type {
  LoanProductImportResult,
  UpdateLoanProductPayload,
} from '../api/loan-product-types'
import type { LoanProductResponse } from '@/src/shared/lib/api/types'
import {
  getLoanProductByCode,
  getLoanProducts,
  importLoanProducts,
  syncLoanProducts,
  updateLoanProduct,
} from '../api/loan-products'

const LOAN_PRODUCTS_STALE_TIME = 30_000

export function useLoanProducts() {
  return useQuery({
    queryKey: loanProductKeys.list(),
    queryFn: getLoanProducts,
    staleTime: LOAN_PRODUCTS_STALE_TIME,
    refetchOnMount: 'always',
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
    refetchOnMount: 'always',
  })
}

function useInvalidateLoanProducts() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({
      queryKey: loanProductKeys.all,
    })
  }
}

export function useUpdateLoanProduct() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateLoanProducts()
  return useMutation({
    mutationFn: ({
      code,
      payload,
    }: {
      code: string
      payload: UpdateLoanProductPayload
    }) => updateLoanProduct(code, payload),
    onSuccess: async (updated: LoanProductResponse) => {
      queryClient.setQueryData(loanProductKeys.detail(updated.code), updated)
      await invalidate()
    },
  })
}

export function useSyncLoanProducts() {
  const invalidate = useInvalidateLoanProducts()
  return useMutation({
    mutationFn: () => syncLoanProducts(),
    onSuccess: async () => {
      await invalidate()
    },
  })
}

export function useImportLoanProducts() {
  const invalidate = useInvalidateLoanProducts()
  return useMutation<LoanProductImportResult, Error, File>({
    mutationFn: importLoanProducts,
    onSuccess: async () => {
      await invalidate()
    },
  })
}
