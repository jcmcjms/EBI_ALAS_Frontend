import type { UserResponse } from '@/src/shared/lib/api/types'

export interface UserProfileChanges {
  firstName: string
  middleName: string
  lastName: string
  branchId: string
  role: string
  jobTitle?: string | null
  eSignature?: string | null
  coveredBranches?: string[] | null
}

export type EditableProfile = {
  firstName: string
  middleName: string
  lastName: string
  branchId: string
  role: string
  jobTitle: string
  coveredBranches: string[]
}

export function profileFrom(user: UserResponse): EditableProfile {
  return {
    firstName: user.firstName,
    middleName: user.middleName ?? '',
    lastName: user.lastName,
    branchId: user.branchId,
    role: user.role,
    jobTitle: user.approvalAuthority?.key ?? user.jobTitle ?? '',
    coveredBranches: user.coveredBranches ?? [],
  }
}

export const emptyProfile: EditableProfile = {
  firstName: '',
  middleName: '',
  lastName: '',
  branchId: '',
  role: '',
  jobTitle: '',
  coveredBranches: [],
}