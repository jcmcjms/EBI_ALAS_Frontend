/**
 * Wire contract for `POST /api/loans` (backend `SubmitLoanRequest`).
 * The API takes this flat body and returns a bare `LoanResponse` (201).
 * Nested form sections (client, loans, deviations, …) are never sent.
 */
export interface SubmitLoanRequest {
  applicationGroupNo: string
  clientName: string
  branchId: string
  productCode: string
  product: string
  loanType: 'New' | 'Reloan'
  principal: number
  termDays: number
  interestRatePerMonth: number
  serviceFee: number
  insuranceFee: number
  otherDeductions: number
}

/**
 * Input accepted by {@link toSubmitLoanRequest}. Carries the same values as
 * the wire body; any extra/nested properties on the object are ignored.
 * UI models spell the reloan case `Renewal`; the wire enum value is `Reloan`.
 */
export interface SubmitLoanDraft {
  applicationGroupNo: string
  clientName: string
  branchId: string
  productCode: string
  product: string
  loanType: 'New' | 'Reloan' | 'Renewal'
  principal: number
  termDays: number
  interestRatePerMonth: number
  serviceFee: number
  insuranceFee: number
  otherDeductions: number
}

export function toSubmitLoanRequest(
  input: SubmitLoanDraft & Record<string, unknown>,
): SubmitLoanRequest {
  return {
    applicationGroupNo: input.applicationGroupNo,
    clientName: input.clientName,
    branchId: input.branchId,
    productCode: input.productCode,
    product: input.product,
    loanType: input.loanType === 'New' ? 'New' : 'Reloan',
    principal: input.principal,
    termDays: input.termDays,
    interestRatePerMonth: input.interestRatePerMonth,
    serviceFee: input.serviceFee,
    insuranceFee: input.insuranceFee,
    otherDeductions: input.otherDeductions,
  }
}
