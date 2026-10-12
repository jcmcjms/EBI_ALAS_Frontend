import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'

export interface BranchResponse {
  code: string
  name: string
}

export const branchKeys = {
  all: ['branches'] as const,
  list: () => ['branches', 'list'] as const,
}

export async function getBranches(): Promise<BranchResponse[]> {
  const res = await apiClient.get<BranchResponse[]>('/api/branches')
  return res.data
}

const BRANCHES_STALE_TIME = 60 * 60_000

export function useBranches() {
  return useQuery({
    queryKey: branchKeys.list(),
    queryFn: getBranches,
    staleTime: BRANCHES_STALE_TIME,
  })
}
