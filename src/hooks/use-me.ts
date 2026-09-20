import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/lib/queryKeys";
import { unwrapApiData, type ApiResponse } from "@/src/lib/api/types";
import { extractUserFromToken } from "@/src/lib/jwt";
import { useAuthStore } from "@/src/store/authStore";

/**
 * GET /api/auth/me — current authenticated user from the backend.
 *
 * Security-critical: this is the source of truth for the user's roles
 * and permissions, so we want it fresh enough that permission changes
 * take effect quickly, but not so fresh that we hammer the server.
 *
 * 30-second `staleTime` is a deliberate balance: TanStack will revalidate
 * in the background when the data ages, but won't refetch on focus or
 * on every consumer mount. Invalidation is handled by the login/logout
 * flows via `queryKeys.me`.
 */
const ME_STALE_TIME = 30 * 1000; // 30 seconds

export interface MeResponse {
    userId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    branchId: string;
    role: string;
    permissions: string[];
    mustChangePassword: boolean;
}

/**
 * Read the current user.
 *
 * Optimization: if the in-memory access token is available, decode its
 * claims directly. This avoids an unnecessary round-trip to `/api/auth/me`
 * after a silent refresh-token restore. The 30s `staleTime` still
 * triggers a background refresh when the data ages.
 */
export function useMe() {
    const accessToken = useAuthStore((state) => state.accessToken);

    return useQuery({
        queryKey: queryKeys.me,
        queryFn: async (): Promise<MeResponse> => {
            if (accessToken) {
                const fromToken = extractUserFromToken(accessToken);
                if (fromToken) return fromToken as MeResponse;
            }
            const res = await apiClient.get<ApiResponse<MeResponse>>("/api/auth/me");
            return unwrapApiData(res.data);
        },
        enabled: !!accessToken,
        staleTime: ME_STALE_TIME,
    });
}