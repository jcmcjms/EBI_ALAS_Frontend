import { apiClient } from "@/src/lib/apiClient";
import {
    unwrapApiData,
    type ApiResponse,
    type CreateUserPayload,
    type PagedResult,
    type ResetPasswordResponse,
    type UpdateUserPayload,
    type UserAuditLogResponse,
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
            branchId: params.branchId || undefined,
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

/** POST /api/users/{id}/reset-password. Requires `user.edit`. Server generates the password. */
export async function resetUserPassword(id: number): Promise<ResetPasswordResponse> {
    const res = await apiClient.post<ApiResponse<ResetPasswordResponse>>(`/api/users/${id}/reset-password`, {});
    return unwrapApiData(res.data);
}

/** POST /api/users/{id}/force-password-reset. Requires `user.edit`. */
export async function forcePasswordReset(id: number): Promise<void> {
    const res = await apiClient.post<ApiResponse<null>>(`/api/users/${id}/force-password-reset`);
    if (!res.data.success) throw new Error(res.data.message || "Failed to force password reset");
}

/** POST /api/users/{id}/revoke-sessions. Requires `user.suspend`. Returns count of revoked sessions. */
export async function revokeUserSessions(id: number): Promise<number> {
    const res = await apiClient.post<ApiResponse<number>>(`/api/users/${id}/revoke-sessions`);
    return unwrapApiData(res.data);
}

/** GET /api/users/{id}/audit-log. Requires `user.view`. */
export async function getUserAuditLog(id: number, pageNumber = 1, pageSize = 20): Promise<UserAuditLogResponse[]> {
    const res = await apiClient.get<ApiResponse<UserAuditLogResponse[]>>(`/api/users/${id}/audit-log`, {
        params: { pageNumber, pageSize },
    });
    return unwrapApiData(res.data);
}

// ─── Import/Export Functions ────────────────────────────────────────────

export async function exportUsers(params: UserQueryParams = {}): Promise<void> {
    const res = await apiClient.get("/api/users/export", {
        params: {
            search: params.search || undefined,
            role: params.role || undefined,
            branchCode: params.branchId || undefined,
            isActive: params.isActive ?? undefined,
        },
        responseType: "blob",
    });

    const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function downloadImportTemplate(): Promise<void> {
    const res = await apiClient.get("/api/users/import/template", {
        responseType: "blob",
    });

    const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "user-import-template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export interface UserImportValidationError {
    rowNumber: number;
    field: string;
    error: string;
}

export interface UserImportResult {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    errors: UserImportValidationError[];
    createdUsernames: string[];
}

export async function importUsers(file: File): Promise<UserImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiClient.post<ApiResponse<UserImportResult>>(
        "/api/users/import",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return unwrapApiData(res.data);
}
