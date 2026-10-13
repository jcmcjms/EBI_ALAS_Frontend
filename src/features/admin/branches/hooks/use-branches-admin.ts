import { useMutation, useQueryClient } from '@tanstack/react-query'
import { branchKeys } from '@/src/shared/lib/api/branches'
import type { BranchStatus } from '@/src/shared/lib/api/types'
import type {
  CreateBranchPayload,
  UpdateBranchPayload,
} from '../api/branch-types'
import {
  createBranch,
  updateBranch,
  updateBranchStatus,
} from '../api/branches-api'

function useInvalidateBranches() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: branchKeys.all })
  }
}

export function useCreateBranch() {
  const invalidate = useInvalidateBranches()
  return useMutation({
    mutationFn: (payload: CreateBranchPayload) => createBranch(payload),
    onSuccess: async () => {
      await invalidate()
    },
  })
}

export function useUpdateBranch() {
  const invalidate = useInvalidateBranches()
  return useMutation({
    mutationFn: ({
      code,
      payload,
    }: {
      code: string
      payload: UpdateBranchPayload
    }) => updateBranch(code, payload),
    onSuccess: async () => {
      await invalidate()
    },
  })
}

export function useUpdateBranchStatus() {
  const invalidate = useInvalidateBranches()
  return useMutation({
    mutationFn: ({ code, status }: { code: string; status: BranchStatus }) =>
      updateBranchStatus(code, status),
    onSuccess: async () => {
      await invalidate()
    },
  })
}
