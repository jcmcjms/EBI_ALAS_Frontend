import type { BranchStatus } from '@/src/shared/lib/api/types'

export interface CreateBranchPayload {
  code: string
  name: string
  areaCode: string
}

export interface UpdateBranchPayload {
  name: string
  areaCode: string
}

export interface UpdateBranchStatusPayload {
  status: BranchStatus
}
