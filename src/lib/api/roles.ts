import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse, type RoleInfo, type RoleMatrixEntry } from "./types";

/**
 * Roles & permissions API — mirrors Features/RoleManagement/RoleEndpoints.cs.
 * Both endpoints require `role.view` (CanViewRoles policy).
 *
 * NOTE: The matrix is read-only — role→permission mapping lives in backend code
 * (Common/Constants/RolePermissions.cs). There is no save endpoint.
 */

/** GET /api/roles — all system roles. Requires `role.view`. */
export async function listRoles(): Promise<RoleInfo[]> {
    const res = await apiClient.get<ApiResponse<RoleInfo[]>>("/api/roles");
    return unwrapApiData(res.data);
}

/** GET /api/roles/matrix — each role with its granted permissions. Requires `role.view`. */
export async function getRoleMatrix(): Promise<RoleMatrixEntry[]> {
    const res = await apiClient.get<ApiResponse<RoleMatrixEntry[]>>("/api/roles/matrix");
    return unwrapApiData(res.data);
}
