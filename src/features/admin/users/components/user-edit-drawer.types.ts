import type { UserResponse } from '../api/users-types'

export interface UserProfileChanges {
  firstName: string
  middleName: string
  lastName: string
  email: string
  branchId: string
  role: string
  jobTitle: string
}

export type EditableProfile = {
  firstName: string
  middleName: string
  lastName: string
  email: string
  branchId: string
  role: string
  jobTitle: string
}

export function profileFrom(user: UserResponse): EditableProfile {
  return {
    firstName: user.firstName,
    middleName: user.middleName ?? '',
    lastName: user.lastName,
    email: user.email ?? '',
    branchId: user.branchId,
    role: user.role,
    jobTitle: user.jobTitle ?? '',
  }
}

export const emptyProfile: EditableProfile = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  branchId: '',
  role: '',
  jobTitle: '',
}
