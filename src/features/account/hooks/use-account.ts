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
import type { ActivityFilters } from '../api/activity-query'

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

export function useAccountActivity(
  limit = 10,
  filters: ActivityFilters = {},
) {
  return useQuery({
    queryKey: accountKeys.activity(limit, filters),
    queryFn: () => getAccountActivity(limit, filters),
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
      toastSuccess('Profile saved')
    },
    onError: (error) => {
      toastError(getErrorMessage(error) || "Couldn't save your profile")
    },
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revokeAccountSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      toastSuccess('Device signed out')
    },
    onError: (error) => {
      toastError(getErrorMessage(error) || "Couldn't sign out that device")
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
        `Signed out ${revokedCount} other ${revokedCount === 1 ? 'device' : 'devices'}`,
      )
    },
    onError: (error) => {
      toastError(getErrorMessage(error) || "Couldn't sign out the other devices")
    },
  })
}
