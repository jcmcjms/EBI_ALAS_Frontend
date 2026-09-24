/**
 * Roles API — reference data for role dropdowns/filters.
 */

import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse, type RoleInfo } from "@/src/lib/api/types";

export type { RoleInfo };

export async function listRoles(): Promise<RoleInfo[]> {
    const res = await apiClient.get<ApiResponse<RoleInfo[]>>("/api/roles");
    return unwrapApiData(res.data);
}
