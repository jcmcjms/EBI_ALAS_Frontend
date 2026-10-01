export type NthpCarrier = { netTakeHomePay?: number }

export type LoanParamsCarrier = {
  proposedAmount?: number
  interestRate?: number
  term?: number
}

export type OutstandingLoanCarrier = {
  outstandingBalance?: number
  principalBalance?: number
}

export type EbiRowCarrier = {
  outstandingBalance?: number
  existingDeduction?: number
}

export type BuyOutRowCarrier = { outstandingBalance?: number }

export type IncomingRowCarrier = { deductions?: number }

export type FormCarrier = {
  loan?: LoanParamsCarrier
  client?: NthpCarrier
  outstandingLoans?: readonly OutstandingLoanCarrier[]
  ebiReloans?: readonly EbiRowCarrier[]
  buyOuts?: readonly BuyOutRowCarrier[]
  incomingLoans?: readonly IncomingRowCarrier[]
}

export interface LoanComputationInputs {
  principal: number

  annualRatePercent: number

  termDays: number

  applicationChargeRate: number

  docStamp: number

  notarialFee: number

  insurance: number

  advanceInterest: number

  outstandingBalance: number

  buyOutBalance: number
}

export interface DisposableIncomeInputs {
  nthp: number

  otherIncome: number

  otherMonthlyObligations: number
}

export interface LoanComputationResults {
  monthlyAmortization: number
  applicationCharge: number
  totalUpfrontDeductions: number
  grossProceeds: number
  netProceeds: number

  totalMonthlyObligations: number

  totalDisposable: number

  isAmortizationExceedingDisposable: boolean

  minimumRequiredAmortization: number
}

export function computeMonthlyAmortization(
  principal: number,
  annualRatePercent: number,
  termDays: number,
): number {
  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(annualRatePercent) ||
    !Number.isFinite(termDays)
  ) {
    return 0
  }
  if (principal <= 0 || termDays <= 0) return 0

  const termMonths = Math.floor(termDays / 30)
  if (termMonths <= 0) return 0
  if (annualRatePercent === 0) return round2(principal / termMonths)

  const r = Math.round((annualRatePercent / 100 / 12) * 1_000_000) / 1_000_000
  const n = termMonths
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -n))

  return round2(pmt)
}

export const LOAN_AMOUNT_DENOMINATION = 100

const ATM_HARD_CAPS: Readonly<Record<string, number>> = {
  C34: 200_000,
  C21: 135_000,
  C27: 120_000,
  C29: 100_000,
  C25: 200_000,
}

export function computeMaximumLoanableAmount(
  monthlyCapacity: number,
  annualRatePercent: number,
  termDays: number,
  productCode?: string | null,
): number {
  const code = (productCode ?? '').trim().toUpperCase()
  if (code in ATM_HARD_CAPS) {
    return ATM_HARD_CAPS[code]
  }

  if (!Number.isFinite(monthlyCapacity) || monthlyCapacity === 0) return 0
  if (!Number.isFinite(annualRatePercent) || !Number.isFinite(termDays))
    return 0

  const termMonths = Math.floor(termDays / 30)
  if (termMonths <= 0) return 0

  const r = Math.round((annualRatePercent / 100 / 12) * 1_000_000) / 1_000_000

  const absCapacity = Math.abs(monthlyCapacity)
  const pvMagnitude =
    r === 0
      ? absCapacity * termMonths
      : (absCapacity * (1 - Math.pow(1 + r, -termMonths))) / r

  const flooredMagnitude =
    Math.floor(pvMagnitude / LOAN_AMOUNT_DENOMINATION) *
    LOAN_AMOUNT_DENOMINATION

  return Math.sign(monthlyCapacity) * flooredMagnitude
}

export function getMinimumRequiredAmortization(loanAmount: number): number {
  if (!Number.isFinite(loanAmount) || loanAmount < 100_000) return 0
  if (loanAmount <= 110_000) return 3_000
  if (loanAmount <= 130_000) return 3_500
  if (loanAmount <= 145_000) return 4_000
  if (loanAmount <= 165_000) return 4_500
  if (loanAmount <= 200_000) return 5_000

  const overage = loanAmount - 200_000
  return 5_000 + Math.ceil(overage / 20_000) * 500
}

export function computeLoanMetrics(
  loanInputs: LoanComputationInputs,
  incomeInputs: DisposableIncomeInputs,
): LoanComputationResults {
  const {
    principal,
    annualRatePercent,
    termDays,
    applicationChargeRate,
    docStamp,
    notarialFee,
    insurance,
    advanceInterest,
    outstandingBalance,
    buyOutBalance,
  } = loanInputs

  const monthlyAmortization = computeMonthlyAmortization(
    principal,
    annualRatePercent,
    termDays,
  )

  const applicationCharge = round2(principal * applicationChargeRate)
  const totalUpfrontDeductions = round2(
    applicationCharge + docStamp + notarialFee + insurance + advanceInterest,
  )

  const grossProceeds = round2(principal - totalUpfrontDeductions)

  const netProceeds = round2(grossProceeds - outstandingBalance - buyOutBalance)

  const totalMonthlyObligations = round2(
    monthlyAmortization + (incomeInputs.otherMonthlyObligations || 0),
  )
  const totalDisposable = round2(
    (incomeInputs.nthp || 0) +
      (incomeInputs.otherIncome || 0) -
      totalMonthlyObligations,
  )

  return {
    monthlyAmortization,
    applicationCharge,
    totalUpfrontDeductions,
    grossProceeds,
    netProceeds,
    totalMonthlyObligations,
    totalDisposable,

    isAmortizationExceedingDisposable: totalDisposable < 0,
    minimumRequiredAmortization: getMinimumRequiredAmortization(principal),
  }
}

export interface LoanMetricsSnapshot {
  loan: LoanParamsCarrier
  client: NthpCarrier
  outstandingLoans: readonly OutstandingLoanCarrier[]
  ebiReloans: readonly EbiRowCarrier[]
  buyOuts: readonly BuyOutRowCarrier[]
  incomingLoans: readonly IncomingRowCarrier[]

  applicationChargeRate?: number

  productFees?: {
    docStamp: number
    notarialFee: number
    insurance: number
    advanceInterest: number
  }
}

export function buildLoanMetricsSnapshot(
  form: FormCarrier,
  applicationChargeRate = 0.06,
  productFees?: LoanMetricsSnapshot['productFees'],
): {
  loan: LoanComputationInputs
  income: DisposableIncomeInputs
} {
  const principal = form.loan?.proposedAmount || 0
  const annualRatePercent = form.loan?.interestRate || 0
  const termDays = form.loan?.term || 0

  const outstandingBalance = (form.ebiReloans ?? []).reduce(
    (sum: number, row) => sum + (row?.outstandingBalance || 0),
    0,
  )

  const buyOutBalance = (form.buyOuts ?? []).reduce(
    (sum: number, row) => sum + (row?.outstandingBalance || 0),
    0,
  )

  const otherMonthlyObligations = (form.incomingLoans ?? []).reduce(
    (sum: number, row) => sum + (row?.deductions || 0),
    0,
  )

  return {
    loan: {
      principal,
      annualRatePercent,
      termDays,
      applicationChargeRate,
      docStamp: productFees?.docStamp ?? 0,
      notarialFee: productFees?.notarialFee ?? 0,
      insurance: productFees?.insurance ?? 0,
      advanceInterest: productFees?.advanceInterest ?? 0,
      outstandingBalance,
      buyOutBalance,
    },
    income: {
      nthp: form.client?.netTakeHomePay || 0,
      otherIncome: 0,
      otherMonthlyObligations,
    },
  }
}

export const MAX_GRACE_DAYS = 90

export function resolveApprovalTermDays(
  termDays: number,
  policyTermMonths?: number | null,
): number {
  const rawTermDays = termDays || 0
  const policyTermDays = (policyTermMonths ?? 0) * DAYS_PER_MONTH
  const graceDays = rawTermDays - policyTermDays

  return policyTermDays > 0 && graceDays >= 0 && graceDays <= MAX_GRACE_DAYS
    ? policyTermDays
    : rawTermDays
}

export const DAYS_PER_MONTH = 30

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}
