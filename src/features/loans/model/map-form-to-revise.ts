import type { LoanApplicationFormData } from '../schemas/schema'
import type { ReviseLoanCommand } from '../api/loan-revise'

export function mapFormToReviseCommand(
  form: LoanApplicationFormData,
  revisionNotes: string,
  rowVersion: string | null,
): ReviseLoanCommand {
  const clientName = [
    form.client.firstName,
    form.client.middleName,
    form.client.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  const loan = form.loans[0]
  const params = loan?.parameters

  return {
    clientName,
    principal: params?.proposedAmount ?? 0,
    termDays: params?.term ?? 0,
    interestRatePerMonth: params?.interestRate ?? 0,
    form,
    revisionNotes,
    rowVersion,
  }
}
