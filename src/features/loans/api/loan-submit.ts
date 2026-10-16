
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
