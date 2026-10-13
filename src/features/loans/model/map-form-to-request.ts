import type { LoanSubmissionPayload } from '../api/loan-types'
import type { LoanApplicationFormData } from '../schemas/schema'
import {
  toSubmitLoanApplicationsRequest,
  type SubmitLoanApplicationsRequest,
  type SubmitLoanLine,
} from '../api/loan-submit'

export function mapFormToSubmissionPayload(
  form: LoanApplicationFormData,
): LoanSubmissionPayload {
  return {
    branchType: {
      creationTypeCode: form.branchType.creationTypeCode,
      creationTypeLabel: form.branchType.creationTypeLabel,
      branch: form.branchType.branch,
      requestingOfficer: form.branchType.requestingOfficer,
      lai: form.branchType.lai || undefined,
    },
    client: { ...form.client },
    loans: form.loans.map((loan) => ({
      loanNo: loan.loanNo,
      productCode: loan.productCode,
      productDescription: loan.productDescription,
      creationTypeCode: loan.creationTypeCode,
      creationTypeLabel: loan.creationTypeLabel,
      branchCode: loan.branchCode,
      cDocStamp: loan.cDocStamp,
      parameters: loan.parameters,
      ebiReloans: loan.ebiReloans.map((row) => ({ ...row })),
      buyOuts: loan.buyOuts.map((row) => ({ ...row })),
      incomingLoans: loan.incomingLoans.map((row) => ({ ...row })),
      verification: { findings: loan.verification.findings },
      deviations: { ...loan.deviations },
    })),
    outstandingLoans: form.outstandingLoans.map((row) => ({ ...row })),
    preLoan: form.preLoan
      ? {
          id: form.preLoan.id,
          accountNo: form.preLoan.accountNo,
          bch: form.preLoan.bch,
          formNumber: form.preLoan.formNumber,
          productDescription: form.preLoan.productDescription,
        }
      : undefined,
    loanType: form.loanType ?? 'New',
  }
}

/**
 * Multi-loan body for `POST /api/loans`. One application group, one entry per
 * selected loan. Group number left empty so the API allocates APP-{date}-{seq}.
 */
export function mapFormToSubmitLoanRequest(
  form: LoanApplicationFormData,
): SubmitLoanApplicationsRequest {
  const clientName = [
    form.client.firstName,
    form.client.middleName,
    form.client.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  const fallbackBranch = form.branchType.branch || ''
  const loans: SubmitLoanLine[] = form.loans.map((loan) => {
    const params = loan.parameters
    return {
      productCode: loan.productCode ?? '',
      product: params.product || loan.productDescription || '',
      principal: params.proposedAmount ?? 0,
      termDays: params.term ?? 0,
      interestRatePerMonth: params.interestRate ?? 0,
      serviceFee: (params.notarialFee ?? 0) + (params.docStamps ?? 0),
      insuranceFee: params.insurance ?? 0,
      otherDeductions: 0,
    }
  })

  return toSubmitLoanApplicationsRequest({
    applicationGroupNo: '',
    clientName,
    branchId: form.loans[0]?.branchCode || fallbackBranch,
    loanType: form.loanType === 'Renewal' ? 'Reloan' : 'New',
    loans,
  })
}
