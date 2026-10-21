import { apiClient } from '@/src/shared/lib/apiClient'

export interface GroupLoanSummary {
  id: string
  lamId: string
  status: string
  branchCode: string
  loanNo: string
  productCode: string
  product: string
  proposedAmount: number
  unresolvedDocs: number
}

export interface LoanGroupLoan {
  id: number
  lamId: string
  productCode: string
  proposedAmount: number
  status: string
}

export interface LoanGroupResponse {
  groupNo: string
  loans: GroupLoanSummary[]
}

export async function getLoanGroup(
  groupNo: string,
): Promise<LoanGroupResponse> {
  const res = await apiClient.get<LoanGroupResponse>(
    `/api/loan-groups/${encodeURIComponent(groupNo)}`,
  )
  return res.data
}
