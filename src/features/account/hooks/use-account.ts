import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toastError, toastSuccess } from '@/src/shared/ui/feedback/toast'
import { accountKeys } from '@/src/features/account/api/account-queries'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import {
  getAccountProfile,
  getAccountSessions,
  getAccountActivity,
  getAccountLoans,
  getAccountClients,
  updateAccountProfile,
  revokeAccountSession,
  revokeOtherSessions,
  type PagedSessionsResponse,
} from '../api/account'

export function useAccountProfile() {
  return useQuery({
    queryKey: accountKeys.profile,
    queryFn: getAccountProfile,
    staleTime: 5 * 60_000,
  })
}

export function useAccountSessions(pageNumber = 1, pageSize = 10) {
  return useQuery<PagedSessionsResponse>({
    queryKey: accountKeys.sessions(pageNumber, pageSize),
    queryFn: () => getAccountSessions(pageNumber, pageSize),
    staleTime: 2 * 60_000,
  })
}

export function useAccountActivity(limit = 10) {
  return useQuery({
    queryKey: accountKeys.activity(limit),
    queryFn: () => getAccountActivity(limit),
    staleTime: 2 * 60_000,
  })
}

export function useAccountLoans(limit = 10) {
  return useQuery({
    queryKey: accountKeys.loans(limit),
    queryFn: () => getAccountLoans(limit),
    staleTime: 2 * 60_000,
  })
}

export function useAccountClients(limit = 5) {
  return useQuery({
    queryKey: accountKeys.clients(limit),
    queryFn: () => getAccountClients(limit),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateAccountProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.profile })
      toastSuccess('Profile updated successfully')
    },
    onError: (error) => {
      toastError(getErrorMessage(error) || 'Failed to update profile')
    },
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revokeAccountSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      toastSuccess('Session revoked successfully')
    },
    onError: (error) => {
      toastError(getErrorMessage(error) || 'Failed to revoke session')
    },
  })
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: (revokedCount) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      toastSuccess(
        `${revokedCount} other session${revokedCount === 1 ? '' : 's'} revoked`,
      )
    },
    onError: (error) => {
      toastError(getErrorMessage(error) || 'Failed to revoke other sessions')
    },
  })
}
