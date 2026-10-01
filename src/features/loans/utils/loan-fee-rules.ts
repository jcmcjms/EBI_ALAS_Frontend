import type { LoanProductResponse } from '@/src/lib/api/types'

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0

  return (Math.sign(value) * Math.round(Math.abs(value) * 100)) / 100
}

export function computeStandardFee(
  fee:
    | { notarialFee: number }
    | { docStampFee: number }
    | { insuranceFee: number }
    | number,

  _principal: number,
): number {
  if (typeof fee === 'number') return roundCurrency(fee)
  if ('notarialFee' in fee) return roundCurrency(fee.notarialFee)
  if ('docStampFee' in fee) return roundCurrency(fee.docStampFee)
  if ('insuranceFee' in fee) return roundCurrency(fee.insuranceFee)
  return 0
}

export interface ExpectedFeesSnapshot {
  notarialFee: number
  docStamps: number
  insurance: number
}

export function computeExpectedFees(
  product: LoanProductResponse | null | undefined,

  _principal: number,
): ExpectedFeesSnapshot {
  if (!product) {
    return { notarialFee: 0, docStamps: 0, insurance: 0 }
  }
  return {
    notarialFee: roundCurrency(product.notarialFee),
    docStamps: roundCurrency(product.docStampFee),
    insurance: roundCurrency(product.insuranceFee),
  }
}
