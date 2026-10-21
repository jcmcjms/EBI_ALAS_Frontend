import { useQuery } from '@tanstack/react-query'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import {
  getLoanGroup,
  type LoanGroupResponse,
} from '@/src/features/loans/api/loan-groups'

export function useLoanGroup(groupNo: string | undefined, enabled = true) {
  return useQuery<LoanGroupResponse>({
    queryKey: loanKeys.group(groupNo!),
    queryFn: () => getLoanGroup(groupNo!),
    enabled: enabled && !!groupNo,
    staleTime: 15_000,
  })
}
