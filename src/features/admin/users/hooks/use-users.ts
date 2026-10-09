import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userKeys } from '@/src/features/admin/users/api/user-queries'
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserAuditLogResponse,
  UserQueryParams,
  UserResponse,
} from '../api/users-types'
import {
  createUser,
  getUser,
  listUsers,
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

export function useUser(id: string | null) {
  return useQuery({
    queryKey: id !== null ? userKeys.detail(id) : ['users', 'detail', 'disabled'],
    queryFn: () => getUser(id!),
    enabled: id !== null,
  })
}

/** Backend has no per-user audit endpoint yet. */
export function useUserAuditLog(id: string | null) {
  return useQuery({
    queryKey:
      id !== null ? userKeys.auditLog(id) : ['users', 'audit-log', 'disabled'],
    queryFn: (): Promise<UserAuditLogResponse[]> => Promise.resolve([]),
    enabled: id !== null,
  })
}

export function useUserStats() {
  const stats = useQuery({
    queryKey: userKeys.stats('total'),
    // Backend list has no isActive filter; sample a wide page for counts.
    queryFn: () => listUsers({ pageNumber: 1, pageSize: 500 }),
  })

  const totalCount = stats.data?.totalCount ?? 0
  const activeCount = (stats.data?.items ?? []).filter((u) => u.isActive).length

  return {
    totalCount,
    activeCount,
    suspendedCount: Math.max(totalCount - activeCount, 0),
    isLoading: stats.isLoading,
  }
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
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateUserStatus() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUserStatus(id, isActive),
    onSuccess: () => invalidate(),
  })
}
