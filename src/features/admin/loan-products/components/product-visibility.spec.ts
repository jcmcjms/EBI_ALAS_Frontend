import { describe, expect, it } from 'vitest'
import type { LoanProductResponse } from '@/src/shared/lib/api/types'
import { filterVisibleProducts } from './product-visibility'

function product(code: string, isRetired: boolean): LoanProductResponse {
  return {
    code,
    description: code,
    minAmount: 0,
    maxAmount: 0,
    minTermDays: 1,
    maxTermDays: 2,
    notarialFee: 0,
    docStampFee: 0,
    insuranceFee: 0,
    advanceInterestRate: 0,
    applicationChargeRate: 0,
    amortizationMode: 'DIM',
    chargeAdvanceInterest: false,
    isRetired,
    lastSyncedAt: '2026-10-09T00:00:00Z',
  }
}

describe('filterVisibleProducts', () => {
  it('hides retired products when include-retired is off', () => {
    const products = [product('A01', false), product('R01', true)]

    const visible = filterVisibleProducts(products, { showRetired: false })

    expect(visible.map((p) => p.code)).toEqual(['A01'])
  })

  it('shows retired products when include-retired is on', () => {
    const products = [product('A01', false), product('R01', true)]

    const visible = filterVisibleProducts(products, { showRetired: true })

    expect(visible.map((p) => p.code)).toEqual(['A01', 'R01'])
  })
})
