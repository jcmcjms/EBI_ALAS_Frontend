/**
 * Roles hook — reference data for role dropdowns/filters.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/src/lib/queryKeys";
import { listRoles, type RoleInfo } from "../api/roles";

const REFERENCE_STALE_TIME = 60 * 60_000; // 1 hour

export function useRoles(): {
    data: RoleInfo[];
    isLoading: boolean;
    error: unknown;
} {
    const query = useQuery({
        queryKey: queryKeys.roles.all,
        queryFn: listRoles,
        staleTime: REFERENCE_STALE_TIME,
    });
    return {
        data: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
    };
}
