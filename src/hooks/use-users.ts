import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createUser,
    forcePasswordReset,
    getUser,
    getUserAuditLog,
    listUsers,
    resetUserPassword,
    revokeUserSessions,
    updateUser,
    updateUserStatus,
} from "@/src/lib/api/users";
import { queryKeys } from "@/src/lib/queryKeys";
import type { CreateUserPayload, UpdateUserPayload, UserQueryParams, UserResponse } from "@/src/lib/api/types";

/** Paged + filtered user directory (server-side search/role/status/pagination). */
export function useUsers(params: UserQueryParams) {
    return useQuery({
        queryKey: queryKeys.users.list(params),
        queryFn: () => listUsers(params),
        placeholderData: (prev) => prev, // keep previous page visible while fetching next
    });
}

export function useUser(id: number | null) {
    return useQuery({
        queryKey: id !== null ? queryKeys.users.detail(id) : ["users", "detail", "disabled"],
        queryFn: () => getUser(id!),
        enabled: id !== null,
    });
}

/**
 * Directory stat cards. Backend exposes no aggregate endpoint, so we read
 * `totalCount` from two 1-row pages: all users vs active users only.
 */
export function useUserStats() {
    const total = useQuery({
        queryKey: [...queryKeys.users.stats(), "total"],
        queryFn: () => listUsers({ pageNumber: 1, pageSize: 1 }),
    });
    const active = useQuery({
        queryKey: [...queryKeys.users.stats(), "active"],
        queryFn: () => listUsers({ pageNumber: 1, pageSize: 1, isActive: true }),
    });

    const totalCount = total.data?.totalCount ?? 0;
    const activeCount = active.data?.totalCount ?? 0;

    return {
        totalCount,
        activeCount,
        suspendedCount: Math.max(totalCount - activeCount, 0),
        isLoading: total.isLoading || active.isLoading,
    };
}

function useInvalidateUsers() {
    const queryClient = useQueryClient();
    // `users.all` is the broadest prefix; partial matching covers stats too.
    return () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
}

/** POST /api/users — requires `user.create`. */
export function useCreateUser(options?: { onSuccess?: (user: UserResponse) => void }) {
    const invalidate = useInvalidateUsers();
    return useMutation({
        mutationFn: (payload: CreateUserPayload) => createUser(payload),
        onSuccess: (user) => {
            invalidate();
            options?.onSuccess?.(user);
        },
    });
}

/** PUT /api/users/{id} — requires `user.edit`. */
export function useUpdateUser() {
    const invalidate = useInvalidateUsers();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
            updateUser(id, payload),
        onSuccess: () => invalidate(),
    });
}

/** PATCH /api/users/{id}/status — requires `user.suspend`. */
export function useUpdateUserStatus() {
    const invalidate = useInvalidateUsers();
    return useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
            updateUserStatus(id, isActive),
        onSuccess: () => invalidate(),
    });
}

/** POST /api/users/{id}/reset-password — requires `user.edit`. Returns new temp password. */
export function useResetUserPassword() {
    const invalidate = useInvalidateUsers();
    return useMutation({
        mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
            resetUserPassword(id, newPassword),
        onSuccess: () => invalidate(),
    });
}

/** POST /api/users/{id}/force-password-reset — requires `user.edit`. */
export function useForcePasswordReset() {
    const invalidate = useInvalidateUsers();
    return useMutation({
        mutationFn: (id: number) => forcePasswordReset(id),
        onSuccess: () => invalidate(),
    });
}

/** POST /api/users/{id}/revoke-sessions — requires `user.suspend`. Returns count of revoked sessions. */
export function useRevokeUserSessions() {
    const invalidate = useInvalidateUsers();
    return useMutation({
        mutationFn: (id: number) => revokeUserSessions(id),
        onSuccess: () => invalidate(),
    });
}

/** GET /api/users/{id}/audit-log — requires `user.view`. */
export function useUserAuditLog(id: number | null) {
    return useQuery({
        queryKey: id !== null ? ["users", id, "audit-log"] : ["users", "audit-log", "disabled"],
        queryFn: () => getUserAuditLog(id!),
        enabled: id !== null,
    });
}
