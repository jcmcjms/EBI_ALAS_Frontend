import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/lib/queryKeys";
import {
    unwrapApiData,
    type ApiResponse,
    type BranchListResponse,
    type BranchResponse,
    type BranchesPagedResult,
    type BranchQueryParams,
} from "@/src/lib/api/types";

/**
 * Branches are reference data — they almost never change at runtime.
 * 1-hour `staleTime` keeps 500+ concurrent users from re-fetching the
 * directory on every page render.
 */
const BRANCHES_STALE_TIME = 60 * 60 * 1000; // 1 hour

/** GET /api/branches — paged list. Requires `branch.view`. */
export function useBranches(params: BranchQueryParams = {}) {
    return useQuery({
        queryKey: queryKeys.branches.list(params),
        queryFn: async () => {
            const res = await apiClient.get<ApiResponse<BranchesPagedResult>>("/api/branches", {
                params: {
                    isActive: params.isActive ?? undefined,
                    pageNumber: params.pageNumber ?? 1,
                    pageSize: params.pageSize ?? 100,
                },
            });
            return unwrapApiData(res.data);
        },
        staleTime: BRANCHES_STALE_TIME,
    });
}

/** GET /api/branches — full flat list (no pagination). Useful for dropdowns. */
export function useAllBranches(onlyActive = true): { data: BranchListResponse[]; isLoading: boolean } {
    const query = useQuery({
        queryKey: queryKeys.branches.list({ isActive: onlyActive, search: undefined }),
        queryFn: async () => {
            const res = await apiClient.get<ApiResponse<BranchesPagedResult>>("/api/branches", {
                params: { isActive: onlyActive, pageNumber: 1, pageSize: 100 },
            });
            return unwrapApiData(res.data);
        },
        staleTime: BRANCHES_STALE_TIME,
    });
    return { data: query.data?.items ?? [], isLoading: query.isLoading };
}

/** GET /api/branches/{id} — single branch. */
export function useBranch(id: number | null) {
    return useQuery({
        queryKey: id !== null ? queryKeys.branches.detail(id) : ["branches", "detail", "disabled"],
        queryFn: async () => {
            const res = await apiClient.get<ApiResponse<BranchResponse>>(`/api/branches/${id}`);
            return unwrapApiData(res.data);
        },
        enabled: id !== null,
        staleTime: BRANCHES_STALE_TIME,
    });
}