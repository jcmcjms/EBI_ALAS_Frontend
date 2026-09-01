import { useQuery } from "@tanstack/react-query";
import { listRoles } from "@/src/lib/api/roles";
import { queryKeys } from "@/src/lib/queryKeys";
import type { RoleInfo } from "@/src/lib/api/types";

/**
 * Roles are static backend constants — they change with a server deploy,
 * not at runtime. 1-hour `staleTime` is appropriate.
 */
const REFERENCE_STALE_TIME = 60 * 60 * 1000; // 1 hour

/** All system roles — used for role dropdowns/filters. */
export function useRoles(): { data: RoleInfo[]; isLoading: boolean; error: unknown } {
    const query = useQuery({
        queryKey: queryKeys.roles.all,
        queryFn: listRoles,
        staleTime: REFERENCE_STALE_TIME,
    });
    return { data: query.data ?? [], isLoading: query.isLoading, error: query.error };
}
