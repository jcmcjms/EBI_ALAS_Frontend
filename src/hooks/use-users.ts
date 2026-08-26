import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createUser,
    getUser,
    listUsers,
    updateUser,
    updateUserStatus,
} from "@/src/lib/api/users";
import type { CreateUserPayload, UpdateUserPayload, UserQueryParams, UserResponse } from "@/src/lib/api/types";

const USERS_KEY = "users";

/** Paged + filtered user directory (server-side search/role/status/pagination). */
export function useUsers(params: UserQueryParams) {
    return useQuery({
        queryKey: [USERS_KEY, params],
        queryFn: () => listUsers(params),
        placeholderData: (prev) => prev, // keep previous page visible while fetching next
    });
}

export function useUser(id: number | null) {
    return useQuery({
        queryKey: [USERS_KEY, id],
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
        queryKey: [USERS_KEY, "stats", "total"],
        queryFn: () => listUsers({ pageNumber: 1, pageSize: 1 }),
    });
    const active = useQuery({
        queryKey: [USERS_KEY, "stats", "active"],
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
    // Stats keys start with the same root, so partial matching covers them too.
    return () => queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
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
