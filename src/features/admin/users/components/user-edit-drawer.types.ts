import type { UserResponse } from '../api/users-types'

export interface UserProfileChanges {
  firstName: string
  middleName: string
  lastName: string
  branchId: string
  role: string
}

export type EditableProfile = {
  firstName: string
  middleName: string
  lastName: string
  branchId: string
  role: string
}

export function profileFrom(user: UserResponse): EditableProfile {
  return {
    firstName: user.firstName,
    middleName: user.middleName ?? '',
    lastName: user.lastName,
    branchId: user.branchId,
    role: user.role,
  }
}

export const emptyProfile: EditableProfile = {
  firstName: '',
  middleName: '',
  lastName: '',
  branchId: '',
  role: '',
}
