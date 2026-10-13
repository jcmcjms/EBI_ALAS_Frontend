import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import type { BranchResponse, BranchStatus } from '@/src/shared/lib/api/types'

export const branchKeys = {
  all: ['branches'] as const,
  list: () => ['branches', 'list'] as const,
}

export async function getBranches(
  status?: BranchStatus | 'all',
): Promise<BranchResponse[]> {
  const res = await apiClient.get<BranchResponse[]>('/api/branches', {
    params: status ? { status } : undefined,
  })
  return res.data
}

const BRANCHES_STALE_TIME = 60 * 60_000

export function findBranchName(
  branches: BranchResponse[] | undefined,
  code: string | null | undefined,
): string {
  if (!code) return ''
  const match = branches?.find((b) => b.code === code)
  return match?.name ?? code
}

/** Canonical user-directory label: `branch code - Branch name`. */
export function formatBranchLabel(
  code: string | null | undefined,
  name?: string | null,
): string {
  if (!code) return ''
  const trimmedName = name?.trim()
  return trimmedName ? `${code} - ${trimmedName}` : code
}

export function findBranchLabel(
  branches: BranchResponse[] | undefined,
  code: string | null | undefined,
): string {
  if (!code) return ''
  const match = branches?.find((b) => b.code === code)
  return formatBranchLabel(code, match?.name)
}

export function toBranchSelectItems(
  branches: BranchResponse[] | undefined,
): Array<{ value: string; label: string }> {
  return (branches ?? []).map((b) => ({
    value: b.code,
    label: formatBranchLabel(b.code, b.name),
  }))
}

export function useBranches() {
  return useQuery({
    queryKey: branchKeys.list(),
    queryFn: () => getBranches('all'),
    staleTime: BRANCHES_STALE_TIME,
  })
}

export function useActiveBranches() {
  return useQuery({
    queryKey: [...branchKeys.list(), 'active'] as const,
    queryFn: () => getBranches('Active'),
    staleTime: BRANCHES_STALE_TIME,
  })
}
