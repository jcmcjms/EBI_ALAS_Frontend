/**
 * Wire contract for `POST /api/loans` (backend `SubmitLoanApplicationsRequest`).
 * One client application group with one or more loans.
 */
export interface SubmitLoanLine {
  productCode: string
  product: string
  principal: number
  termDays: number
  interestRatePerMonth: number
  serviceFee: number
  insuranceFee: number
  otherDeductions: number
}

export interface SubmitLoanApplicationsRequest {
  applicationGroupNo: string
  clientName: string
  branchId: string
  loanType: 'New' | 'Reloan'
  loans: SubmitLoanLine[]
  /** Full create-flow form snapshot so review/approval shows the same values as the preview. */
  form?: unknown
}

export interface CreatedLoanSummary {
  id: string
  lamId: string
  productCode: string
  product: string
  principal: number
  status: string
}

export interface LoanSubmissionResult {
  applicationGroupNo: string
  loans: CreatedLoanSummary[]
}

/** UI models spell the reloan case `Renewal`; the wire enum value is `Reloan`. */
export function toSubmitLoanApplicationsRequest(input: {
  applicationGroupNo: string
  clientName: string
  branchId: string
  loanType: 'New' | 'Reloan' | 'Renewal'
  loans: SubmitLoanLine[]
  form?: unknown
}): SubmitLoanApplicationsRequest {
  return {
    applicationGroupNo: input.applicationGroupNo,
    clientName: input.clientName,
    branchId: input.branchId,
    loanType: input.loanType === 'New' ? 'New' : 'Reloan',
    loans: input.loans,
    form: input.form,
  }
}
