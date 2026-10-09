import type { LoanProductResponse } from '@/src/shared/lib/api/types'

export function filterVisibleProducts(
  products: LoanProductResponse[] | undefined,
  options: { showRetired: boolean },
): LoanProductResponse[] {
  const rows = products ?? []
  return options.showRetired ? rows : rows.filter((p) => !p.isRetired)
}
