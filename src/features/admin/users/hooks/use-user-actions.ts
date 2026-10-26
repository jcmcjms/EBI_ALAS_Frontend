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
import {
  useCreateUser,
  useForcePasswordReset,
  useResetPassword,
  useRevokeSessions,
  useUpdateUser,
  useUpdateUserAvailability,
  useUpdateUserStatus,
} from './use-users'
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

export function useUserActions() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canSuspendUsers = hasPermission(PERMISSIONS.userSuspend)

  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const updateUserStatusMutation = useUpdateUserStatus()
  const updateUserAvailabilityMutation = useUpdateUserAvailability()
  const resetPasswordMutation = useResetPassword()
  const forcePasswordResetMutation = useForcePasswordReset()
  const revokeSessionsMutation = useRevokeSessions()

  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(
    null,
  )
  const [tempCred, setTempCred] = useState<TemporaryCredential | null>(null)

  function closeConfirm() {
    setConfirmAction(null)
  }

  function handleToggleStatusRequest(user: UserResponse) {
    if (!canSuspendUsers) {
      toastError("You don't have permission to suspend or activate users. Ask an administrator for access.")
      return
    }
    if (user.isActive) {
      setConfirmAction({
        title: `Suspend ${formatFullName(user)}?`,
        description: 'They lose access to ALAS immediately, until you activate their account again.',
        actionLabel: 'Suspend',
        destructive: true,
        onConfirm: () => {
          updateUserStatusMutation.mutate(
            { id: user.id, isActive: false },
            {
              onSuccess: () =>
                toastSuccess(`Suspended ${formatFullName(user)}`),
              onError: (e) => toastError(getErrorMessage(e)),
            },
          )
          closeConfirm()
        },
      })
    } else {
      setConfirmAction({
        title: `Activate ${formatFullName(user)}?`,
        description: 'They regain access to ALAS immediately.',
        actionLabel: 'Activate',
        onConfirm: () => {
          updateUserStatusMutation.mutate(
            { id: user.id, isActive: true },
            {
              onSuccess: () =>
                toastSuccess(`Activated ${formatFullName(user)}`),
              onError: (e) => toastError(getErrorMessage(e)),
            },
          )
          closeConfirm()
        },
      })
    }
  }

  function handleToggleAvailabilityRequest(user: UserResponse) {
    updateUserAvailabilityMutation.mutate(
      { id: user.id, available: !user.isAvailable },
      {
        onSuccess: () =>
          toastSuccess(
            user.isAvailable
              ? `${formatFullName(user)} marked unavailable for new work`
              : `${formatFullName(user)} marked available for new work`,
          ),
        onError: (e) => toastError(getErrorMessage(e)),
      },
    )
  }

  async function handleResetPasswordRequest(user: UserResponse) {
    try {
      const result = await resetPasswordMutation.mutateAsync(user.id)
      setTempCred({
        username: result.username,
        temporaryPassword: result.temporaryPassword,
      })
    } catch (error) {
      toastError(getErrorMessage(error))
    }
  }

  async function handleForcePasswordResetRequest(user: UserResponse) {
    try {
      await forcePasswordResetMutation.mutateAsync(user.id)
      toastSuccess(
        `${formatFullName(user)} must change their password at next sign-in.`,
      )
    } catch (error) {
      toastError(getErrorMessage(error))
    }
  }

  async function handleRevokeSessionsRequest(user: UserResponse) {
    try {
      const count = await revokeSessionsMutation.mutateAsync(user.id)
      toastSuccess(
        count > 0
          ? `Revoked ${count} active session${count === 1 ? '' : 's'} for ${formatFullName(user)}.`
          : `${formatFullName(user)} has no active sessions.`,
      )
    } catch (error) {
      toastError(getErrorMessage(error))
    }
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
        email: payload.email.trim(),
        branchId: payload.branchId,
        role: payload.role,
        jobTitle: payload.jobTitle?.trim() || null,
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
          email: changes.email.trim(),
          branchId: changes.branchId,
          role: changes.role,
          jobTitle: changes.jobTitle?.trim() || null,
        } satisfies UpdateUserPayload,
      })
      toastSuccess(
        `${changes.firstName} ${changes.lastName} updated`,
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
    handleToggleAvailabilityRequest,
    handleResetPasswordRequest,
    handleForcePasswordResetRequest,
    handleRevokeSessionsRequest,
    handleCreateUser,
    handleUpdateUser,
    isResetPasswordPending: resetPasswordMutation.isPending,
  }
}
