import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse, type RoleInfo } from "./types";

/**
 * Roles API — mirrors Features/RoleManagement/RoleEndpoints.cs.
 */

/** GET /api/roles — all system roles. */
export async function listRoles(): Promise<RoleInfo[]> {
    const res = await apiClient.get<ApiResponse<RoleInfo[]>>("/api/roles");
    return unwrapApiData(res.data);
}
