import { useQuery } from "@tanstack/react-query";
import { getRoleMatrix, listRoles } from "@/src/lib/api/roles";
import { queryKeys } from "@/src/lib/queryKeys";
import type { RoleInfo, RoleMatrixEntry } from "@/src/lib/api/types";

/**
 * Roles & permissions matrix are static backend constants — they change
 * with a server deploy, not at runtime. 1-hour `staleTime` is appropriate.
 */
const REFERENCE_STALE_TIME = 60 * 60 * 1000; // 1 hour

/** All system roles — used for role dropdowns/filters. Requires `role.view`. */
export function useRoles(): { data: RoleInfo[]; isLoading: boolean; error: unknown } {
    const query = useQuery({
        queryKey: queryKeys.roles.all,
        queryFn: listRoles,
        staleTime: REFERENCE_STALE_TIME,
    });
    return { data: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** Read-only role → permissions matrix. Requires `role.view`. */
export function useRoleMatrix(): { data: RoleMatrixEntry[]; isLoading: boolean; error: unknown } {
    const query = useQuery({
        queryKey: queryKeys.roles.matrix,
        queryFn: getRoleMatrix,
        staleTime: REFERENCE_STALE_TIME,
    });
    return { data: query.data ?? [], isLoading: query.isLoading, error: query.error };
}