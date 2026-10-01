import { parseProductCode } from './loan-product-display'
import {
  computeMaximumLoanableAmount,
  computeMonthlyAmortization,
} from './loan-computations'
import type {
  BuyOut,
  EbiReloan,
  IncomingLoan,
  LoanApplicationFormData,
  SelectedLoan,
} from '../schemas/schema'

export const DAYS_PER_MONTH = 30

export const DEFAULT_MINIMUM_NTHP = 5_000

export const GRACE_TOLERANCE_DAYS = 120

export const LEGACY_TOTAL_DEDUCTION_RATE = 0.06
export const LEGACY_NOTARIAL_FEE = 500

export interface ProductFeeConfig {
  applicationChargeRate: number

  notarialFee: number

  insuranceFee: number

  chargeAdvanceInterest: boolean

  advanceInterestRate: number
}

export function resolveApprovalTermDays(
  feedTermDays: number,
  policyTermMonths?: number | null,
): number {
  if (!policyTermMonths || policyTermMonths <= 0) return feedTermDays
  const policyDays = policyTermMonths * DAYS_PER_MONTH
  return Math.abs(policyDays - feedTermDays) <= GRACE_TOLERANCE_DAYS
    ? policyDays
    : feedTermDays
}

export function toAnnualRatePercent(rate?: number | null): number {
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return 0
  return rate <= 1 ? rate * 100 : rate
}

export function formatRatePercent(rate: number): string {
  return String(Number(rate.toFixed(4)))
}

export function buildProductLine(
  productCode: string | null | undefined,
  productDisplay: string,
  approvalTermDays: number,
  policyTermMonths: number | null | undefined,
  ratePercent: number,
): string {
  const termLabel =
    policyTermMonths &&
    policyTermMonths > 0 &&
    Math.abs(policyTermMonths * DAYS_PER_MONTH - approvalTermDays) <=
      GRACE_TOLERANCE_DAYS
      ? `${policyTermMonths} months`
      : `${approvalTermDays.toLocaleString()} days`

  const codePrefix = productCode?.trim() ? `[ ${productCode.trim()} ] ` : ''

  return `${codePrefix}${productDisplay} ${termLabel} @ ${formatRatePercent(ratePercent)}% per Annum`
}

export function computeLoanMetrics(
  primaryLoan: SelectedLoan,
  obligations: {
    outstandingLoans: LoanApplicationFormData['outstandingLoans']
    ebiReloans: SelectedLoan['ebiReloans']
    buyOuts: SelectedLoan['buyOuts']
    incomingLoans: SelectedLoan['incomingLoans']
    client: LoanApplicationFormData['client']
  },
  productFees?: ProductFeeConfig,
) {
  const { outstandingLoans, ebiReloans, buyOuts, incomingLoans, client } =
    obligations
  const params = primaryLoan.parameters

  const totalBalance = outstandingLoans.reduce(
    (s, l) => s + (l.outstandingBalance || 0),
    0,
  )
  const totalPrincipal = outstandingLoans.reduce(
    (s, l) => s + (l.principalBalance || 0),
    0,
  )
  const ebiDeductions = ebiReloans.reduce(
    (s, r) => s + (r.existingDeduction || 0),
    0,
  )
  const ebiOb = ebiReloans.reduce((s, r) => s + (r.outstandingBalance || 0), 0)
  const buyOutDeductions = buyOuts.reduce(
    (s, b) => s + (b.amortization || 0),
    0,
  )
  const buyOutBalance = buyOuts.reduce(
    (s, b) => s + (b.outstandingBalance || 0),
    0,
  )
  const incomingTotal = incomingLoans.reduce(
    (s, i) => s + (i.deductions || 0),
    0,
  )

  const termDays = params.term || 0
  const approvalTermDays =
    primaryLoan.approvalTermDays ??
    resolveApprovalTermDays(termDays, params.policyTermMonths)
  const annualRatePercent =
    primaryLoan.annualRatePercent ?? toAnnualRatePercent(params.interestRate)

  const principal = params.proposedAmount || 0

  const totalDeductionRate =
    productFees?.applicationChargeRate ?? LEGACY_TOTAL_DEDUCTION_RATE
  const notarialFee = productFees?.notarialFee ?? LEGACY_NOTARIAL_FEE
  const insurance = productFees?.insuranceFee ?? 0

  const docStamp = primaryLoan.cDocStamp ?? 0

  const advanceInterest = productFees?.chargeAdvanceInterest
    ? principal *
      (productFees.advanceInterestRate || 0) *
      (approvalTermDays / 360)
    : 0

  const deductionsSubtotal = principal * totalDeductionRate
  const applicationCharge = Math.max(
    0,
    deductionsSubtotal - docStamp - notarialFee - insurance - advanceInterest,
  )
  const deductionPct =
    principal > 0 ? (deductionsSubtotal / principal) * 100 : 0

  const grossProceeds = principal - deductionsSubtotal
  const netProceedsDs = grossProceeds - ebiOb
  const netProceedsClient = netProceedsDs - buyOutBalance
  const totalExposure = principal + totalPrincipal

  const amortization = computeMonthlyAmortization(
    principal,
    annualRatePercent,
    approvalTermDays,
  )

  const nthp = client.netTakeHomePay || 0
  const netPayAfterDeduction =
    nthp - amortization + ebiDeductions + buyOutDeductions
  const totalMonthlyIncome = netPayAfterDeduction

  const totalDisposableGross = nthp + ebiDeductions + buyOutDeductions
  const minimumNthp = DEFAULT_MINIMUM_NTHP
  const totalDeductionsFinal = minimumNthp + incomingTotal
  const totalDisposableNet = totalDisposableGross - totalDeductionsFinal

  const productCode = parseProductCode(params.product)
  const maximumLoanableAmount = computeMaximumLoanableAmount(
    totalDisposableNet,
    annualRatePercent,
    approvalTermDays,
    productCode,
  )

  return {
    termDays,
    approvalTermDays,
    annualRatePercent,
    amortization,
    applicationCharge,
    docStamp,
    notarialFee,
    insurance,
    advanceInterest,
    deductionsSubtotal,
    deductionPct,
    grossProceeds,
    netProceedsDs,
    netProceedsClient,
    totalExposure,
    totalBalance,
    totalPrincipal,
    ebiDeductions,
    ebiOb,
    buyOutDeductions,
    buyOutBalance,
    incomingTotal,
    nthp,
    netPayAfterDeduction,
    totalMonthlyIncome,
    totalDisposableGross,
    minimumNthp,
    totalDeductionsFinal,
    totalDisposableNet,
    maximumLoanableAmount,
  }
}

export function isBlankReloan(row: EbiReloan): boolean {
  return (
    !row.name?.trim() &&
    !row.pn?.trim() &&
    !row.existingDeduction &&
    !row.outstandingBalance
  )
}

export function isBlankBuyOut(row: BuyOut): boolean {
  return (
    !row.name?.trim() &&
    !row.pn?.trim() &&
    !row.amortization &&
    !row.outstandingBalance
  )
}

export function isBlankIncomingLoan(row: IncomingLoan): boolean {
  return !row.name?.trim() && !row.remarks?.trim() && !row.deductions
}

export function printableObligationRows<T>(
  rows: readonly T[] | undefined,
  isBlank: (row: T) => boolean,
): T[] {
  return (rows ?? []).filter((row) => !isBlank(row))
}

export const FEE_OVERRIDE_REASON =
  'Fee override (notarial / doc stamps / insurance)'

export interface PrintableDeviationEntry {
  reason: string

  remark: string
  isFeeOverride: boolean
}

export interface PrintableDeviationSource {
  hasDeviations?: boolean
  deviationDetails?: string[]
  deviationJustifications?: Record<string, string>
  feeDeviationJustification?: string
}

export function buildPrintableDeviationEntries(
  deviations: PrintableDeviationSource | undefined,
): PrintableDeviationEntry[] {
  if (!deviations) return []

  const seen = new Set<string>()
  const entries: PrintableDeviationEntry[] = []
  for (const reason of deviations.deviationDetails ?? []) {
    if (seen.has(reason)) continue
    seen.add(reason)
    entries.push({
      reason,
      remark: (deviations.deviationJustifications?.[reason] ?? '').trim(),
      isFeeOverride: false,
    })
  }

  const feeRemark = (deviations.feeDeviationJustification ?? '').trim()
  if (feeRemark.length > 0) {
    entries.push({
      reason: FEE_OVERRIDE_REASON,
      remark: feeRemark,
      isFeeOverride: true,
    })
  }

  return entries
}
