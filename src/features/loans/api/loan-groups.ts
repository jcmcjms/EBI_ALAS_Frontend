import { apiClient } from '@/src/shared/lib/apiClient'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'

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

export interface GroupLoanResult {
  loanId: string
  lamId: string
  succeeded: boolean
  error: string | null
}

export interface GroupStatusResponse {
  succeeded: number
  failed: number
  results: GroupLoanResult[]
}

export async function getLoanGroup(
  groupNo: string,
): Promise<LoanGroupResponse> {
  const res = await apiClient.get<LoanGroupResponse>(
    `/api/loan-groups/${encodeURIComponent(groupNo)}`,
  )
  return res.data
}

export async function updateGroupStatus(
  groupNo: string,
  payload: {
    status: string
    comments?: string
    loanIds?: string[]
  },
): Promise<GroupStatusResponse> {
  const res = await apiClient.put<ApiResponse<GroupStatusResponse>>(
    `/api/loan-groups/${encodeURIComponent(groupNo)}/status`,
    payload,
  )
  return unwrapApiData(res.data)
}
