import { apiClient } from '@/src/shared/lib/apiClient'
import type { LoanResponse } from './loan-types'


export interface ReviseLoanCommand {
  clientName?: string
  principal: number
  termDays: number
  interestRatePerMonth: number
  form?: unknown
  revisionNotes: string
  rowVersion?: string | null
}

export async function reviseLoan(
  loanId: string,
  command: ReviseLoanCommand,
): Promise<LoanResponse> {
  const res = await apiClient.put<LoanResponse>(
    `/api/loans/${loanId}/revise`,
    command,
  )
  return res.data
}
