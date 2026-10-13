import type { LoanSubmissionPayload } from '../api/loan-types'
import type { LoanApplicationFormData } from '../schemas/schema'
import { toSubmitLoanRequest, type SubmitLoanRequest } from '../api/loan-submit'

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
 * Flat body for `POST /api/loans` (`SubmitLoanRequest`).
 * `applicationGroupNo` is omitted so the API allocates APP-{date}-{seq}.
 */
export function mapFormToSubmitLoanRequest(
  form: LoanApplicationFormData,
): SubmitLoanRequest {
  const primary = form.loans[0]
  const params = primary?.parameters
  const clientName = [
    form.client.firstName,
    form.client.middleName,
    form.client.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return toSubmitLoanRequest({
    applicationGroupNo: '',
    clientName,
    branchId: primary?.branchCode || form.branchType.branch || '',
    loanType: form.loanType === 'Renewal' ? 'Reloan' : 'New',
    principal: params?.proposedAmount ?? 0,
    termDays: params?.term ?? 0,
    interestRatePerMonth: params?.interestRate ?? 0,
    serviceFee: (params?.notarialFee ?? 0) + (params?.docStamps ?? 0),
    insuranceFee: params?.insurance ?? 0,
    otherDeductions: 0,
  })
}
