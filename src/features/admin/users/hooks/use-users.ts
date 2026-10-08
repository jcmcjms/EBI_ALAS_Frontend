import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userKeys } from '@/src/features/admin/users/api/user-queries'
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserImportResult,
  UserQueryParams,
  UserResponse,
} from '../api/users-types'
import {
  createUser,
  forcePasswordReset,
  getUser,
  getUserAuditLog,
  importUsers,
  listUsers,
  resetUserPassword,
  revokeUserSessions,
  updateUser,
  updateUserStatus,
} from '../api/users'

export function useUsers(params: UserQueryParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    placeholderData: (prev) => prev,
  })
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey:
      id !== null
        ? userKeys.detail(id)
        : ['users', 'detail', 'disabled'],
    queryFn: () => getUser(id!),
    enabled: id !== null,
  })
}

export function useUserStats() {
  const total = useQuery({
    queryKey: userKeys.stats('total'),
    queryFn: () => listUsers({ pageNumber: 1, pageSize: 1 }),
  })
  const active = useQuery({
    queryKey: userKeys.stats('active'),
    queryFn: () => listUsers({ pageNumber: 1, pageSize: 1, isActive: true }),
  })

  const totalCount = total.data?.totalCount ?? 0
  const activeCount = active.data?.totalCount ?? 0

  return {
    totalCount,
    activeCount,
    suspendedCount: Math.max(totalCount - activeCount, 0),
    isLoading: total.isLoading || active.isLoading,
  }
}

export function useUserAuditLog(id: number | null) {
  return useQuery({
    queryKey:
      id !== null
        ? userKeys.auditLog(id)
        : ['users', 'audit-log', 'disabled'],
    queryFn: () => getUserAuditLog(id!),
    enabled: id !== null,
  })
}

function useInvalidateUsers() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: userKeys.all })
}

export function useCreateUser(options?: {
  onSuccess?: (user: UserResponse) => void
}) {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: (user) => {
      invalidate()
      options?.onSuccess?.(user)
    },
  })
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateUserStatus() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateUserStatus(id, isActive),
    onSuccess: () => invalidate(),
  })
}

export function useResetUserPassword() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: (id: number) => resetUserPassword(id),
    onSuccess: () => invalidate(),
  })
}

export function useForcePasswordReset() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: (id: number) => forcePasswordReset(id),
    onSuccess: () => invalidate(),
  })
}

export function useRevokeUserSessions() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: (id: number) => revokeUserSessions(id),
    onSuccess: () => invalidate(),
  })
}

export function useImportUsers() {
  const queryClient = useQueryClient()
  return useMutation<UserImportResult, Error, File>({
    mutationFn: importUsers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
