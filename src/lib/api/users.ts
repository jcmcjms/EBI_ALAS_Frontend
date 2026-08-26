import { apiClient } from "@/src/lib/apiClient";
import {
    unwrapApiData,
    type ApiResponse,
    type CreateUserPayload,
    type PagedResult,
    type UpdateUserPayload,
    type UserQueryParams,
    type UserResponse,
} from "./types";

/**
 * User management API — mirrors Features/Users/UserEndpoints.cs.
 * All endpoints require the corresponding user.* permissions (enforced server-side).
 */

/** GET /api/users — paged, searchable list. Requires `user.view`. */
export async function listUsers(params: UserQueryParams): Promise<PagedResult<UserResponse>> {
    const res = await apiClient.get<ApiResponse<PagedResult<UserResponse>>>("/api/users", {
        params: {
            search: params.search || undefined,
            role: params.role || undefined,
            isActive: params.isActive ?? undefined,
            pageNumber: params.pageNumber ?? 1,
            pageSize: params.pageSize ?? 20,
        },
    });
    return unwrapApiData(res.data);
}

/** GET /api/users/{id}. Requires `user.view`. */
export async function getUser(id: number): Promise<UserResponse> {
    const res = await apiClient.get<ApiResponse<UserResponse>>(`/api/users/${id}`);
    return unwrapApiData(res.data);
}

/** POST /api/users. Requires `user.create`. Returns the created user (201). */
export async function createUser(payload: CreateUserPayload): Promise<UserResponse> {
    const res = await apiClient.post<ApiResponse<UserResponse>>("/api/users", payload);
    return unwrapApiData(res.data);
}

/** PUT /api/users/{id}. Requires `user.edit`. */
export async function updateUser(id: number, payload: UpdateUserPayload): Promise<UserResponse> {
    const res = await apiClient.put<ApiResponse<UserResponse>>(`/api/users/${id}`, payload);
    return unwrapApiData(res.data);
}

/**
 * PATCH /api/users/{id}/status. Requires `user.suspend`.
 * Banking rule: users are never deleted — only activated/suspended.
 */
export async function updateUserStatus(id: number, isActive: boolean): Promise<void> {
    const res = await apiClient.patch<ApiResponse<null>>(`/api/users/${id}/status`, { isActive });
    // Success responses carry no data; failure surfaces via HTTP status or success=false.
    if (!res.data.success) throw new Error(res.data.message || "Failed to update status");
}
