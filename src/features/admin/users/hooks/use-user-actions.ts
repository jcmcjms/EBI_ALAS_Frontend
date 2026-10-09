import { useState } from 'react'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { PERMISSIONS } from '@/src/shared/lib/api/types'
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserResponse,
} from '../api/users-types'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { useCreateUser, useUpdateUser, useUpdateUserStatus } from './use-users'
import type { UserProfileChanges } from '../components/user-edit-drawer'
import type { UserCreatePayload } from '../components/user-create-drawer'
import type { TemporaryCredential } from '../components/temporary-password-dialog'
import { formatFullName } from '../components/user-columns'

export interface ConfirmActionState {
  title: string
  description: string
  actionLabel: string
  destructive?: boolean
  onConfirm: () => void
}

function toastNotAvailable(feature: string) {
  toastError(`${feature} is not available on this API yet.`)
}

export function useUserActions() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canSuspendUsers = hasPermission(PERMISSIONS.userSuspend)

  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const updateUserStatusMutation = useUpdateUserStatus()

  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(
    null,
  )
  const [tempCred, setTempCred] = useState<TemporaryCredential | null>(null)

  function closeConfirm() {
    setConfirmAction(null)
  }

  function handleToggleStatusRequest(user: UserResponse) {
    if (!canSuspendUsers) {
      toastError("You don't have permission to suspend or activate users")
      return
    }
    if (user.isActive) {
      setConfirmAction({
        title: 'Suspend User Account',
        description: `Are you sure you want to suspend ${formatFullName(user)}? This will immediately revoke their access to ALAS.`,
        actionLabel: 'Suspend User',
        destructive: true,
        onConfirm: () => {
          updateUserStatusMutation.mutate(
            { id: user.id, isActive: false },
            {
              onSuccess: () =>
                toastSuccess(
                  `${formatFullName(user)}'s account has been suspended`,
                ),
              onError: (e) => toastError(getErrorMessage(e)),
            },
          )
          closeConfirm()
        },
      })
    } else {
      setConfirmAction({
        title: 'Activate User Account',
        description: `Are you sure you want to activate ${formatFullName(user)}? This will restore their access to ALAS.`,
        actionLabel: 'Activate User',
        onConfirm: () => {
          updateUserStatusMutation.mutate(
            { id: user.id, isActive: true },
            {
              onSuccess: () =>
                toastSuccess(
                  `${formatFullName(user)}'s account has been activated`,
                ),
              onError: (e) => toastError(getErrorMessage(e)),
            },
          )
          closeConfirm()
        },
      })
    }
  }

  function handleResetPasswordRequest(user: UserResponse) {
    void user
    toastNotAvailable('Password reset')
  }

  function handleForcePasswordResetRequest(user: UserResponse) {
    void user
    toastNotAvailable('Forced password reset')
  }

  function handleRevokeSessionsRequest(user: UserResponse) {
    void user
    toastNotAvailable('Session revocation')
  }

  function handleViewAuditLog(
    user: UserResponse,
    setSelectedUserForAuditLog: (user: UserResponse | null) => void,
  ) {
    void user
    void setSelectedUserForAuditLog
    toastNotAvailable('User audit log')
  }

  async function handleCreateUser(
    payload: UserCreatePayload,
  ): Promise<boolean> {
    try {
      await createUserMutation.mutateAsync({
        username: payload.username,
        password: payload.password,
        firstName: payload.firstName,
        middleName: payload.middleName || null,
        lastName: payload.lastName,
        branchId: payload.branchId,
        role: payload.role,
        jobTitle: payload.jobTitle.trim() || null,
        eSignature: payload.eSignature,
        coveredBranches: payload.coveredBranches,
      } satisfies CreateUserPayload)
      setTempCred({
        username: payload.username,
        temporaryPassword: payload.password,
      })
      return true
    } catch (error) {
      toastError(getErrorMessage(error))
      return false
    }
  }

  async function handleUpdateUser(
    userId: string,
    changes: UserProfileChanges,
    setSelectedUser: (user: UserResponse | null) => void,
  ): Promise<boolean> {
    try {
      await updateUserMutation.mutateAsync({
        id: userId,
        payload: {
          firstName: changes.firstName,
          middleName: changes.middleName || null,
          lastName: changes.lastName,
          branchId: changes.branchId,
          role: changes.role,
          jobTitle: changes.jobTitle ?? null,
          eSignature: changes.eSignature,
          coveredBranches: changes.coveredBranches,
        } satisfies UpdateUserPayload,
      })
      toastSuccess(
        `${changes.firstName} ${changes.lastName} updated successfully`,
      )
      setSelectedUser(null)
      return true
    } catch (error) {
      toastError(getErrorMessage(error))
      return false
    }
  }

  return {
    confirmAction,
    closeConfirm,
    tempCred,
    setTempCred,
    handleToggleStatusRequest,
    handleResetPasswordRequest,
    handleForcePasswordResetRequest,
    handleRevokeSessionsRequest,
    handleViewAuditLog,
    handleCreateUser,
    handleUpdateUser,
    isResetPasswordPending: false,
  }
}
