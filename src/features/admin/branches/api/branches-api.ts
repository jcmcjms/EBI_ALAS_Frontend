import { apiClient } from '@/src/shared/lib/apiClient'
import type { BranchResponse, BranchStatus } from '@/src/shared/lib/api/types'
import type { CreateBranchPayload, UpdateBranchPayload } from './branch-types'

export { findBranchName } from '@/src/shared/lib/api/branches'

export function parseBranchStatus(value: string): BranchStatus {
  if (value === 'Active' || value === 'Closed' || value === 'Merged') return value
  throw new Error(`Unknown branch status: ${value}`)
}

export async function createBranch(
  payload: CreateBranchPayload,
): Promise<BranchResponse> {
  const res = await apiClient.post<BranchResponse>('/api/branches', payload)
  return res.data
}

export async function updateBranch(
  code: string,
  payload: UpdateBranchPayload,
): Promise<BranchResponse> {
  const res = await apiClient.put<BranchResponse>(
    `/api/branches/${encodeURIComponent(code)}`,
    payload,
  )
  return res.data
}

export async function updateBranchStatus(
  code: string,
  status: BranchStatus,
): Promise<BranchResponse> {
  const res = await apiClient.patch<BranchResponse>(
    `/api/branches/${encodeURIComponent(code)}/status`,
    { status },
  )
  return res.data
}
