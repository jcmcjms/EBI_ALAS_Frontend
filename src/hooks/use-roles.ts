import { useQuery } from "@tanstack/react-query";
import { getRoleMatrix, listRoles } from "@/src/lib/api/roles";
import type { RoleInfo, RoleMatrixEntry } from "@/src/lib/api/types";

/** All system roles — used for role dropdowns/filters. Requires `role.view`. */
export function useRoles(): { data: RoleInfo[]; isLoading: boolean; error: unknown } {
    const query = useQuery({
        queryKey: ["roles"],
        queryFn: listRoles,
        staleTime: 1000 * 60 * 5, // roles are static backend constants
    });
    return { data: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** Read-only role → permissions matrix. Requires `role.view`. */
export function useRoleMatrix(): { data: RoleMatrixEntry[]; isLoading: boolean; error: unknown } {
    const query = useQuery({
        queryKey: ["role-matrix"],
        queryFn: getRoleMatrix,
        staleTime: 1000 * 60 * 5,
    });
    return { data: query.data ?? [], isLoading: query.isLoading, error: query.error };
}
