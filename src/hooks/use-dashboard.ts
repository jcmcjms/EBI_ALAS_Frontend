import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/lib/queryKeys";

/** Backend response shape from GET /api/dashboard/summary */
export interface DashboardSummaryResponse {
    totalApplications: number;
    totalAmount: number;
    statusCounts: Record<string, number>;
    branchCounts: Record<string, {
        branchCode: string;
        applicationCount: number;
        totalAmount: number;
    }>;
}

/** Frontend display shape */
export interface DashboardSummaryData {
    totalPending: number;
    nowServing: number;
    pushBacksToday: number;
    approvedToday: number;
}

function mapSummaryData(raw: DashboardSummaryResponse): DashboardSummaryData {
    const sc = raw.statusCounts ?? {};
    const totalPending =
        (sc["Draft"] ?? 0) +
        (sc["ForRecommendation"] ?? 0) +
        (sc["ForChecking"] ?? 0) +
        (sc["ForApproval"] ?? 0) +
        (sc["ForRevision"] ?? 0);

    return {
        totalPending,
        nowServing: sc["OnGoing"] ?? 0,
        pushBacksToday: sc["ForRevision"] ?? 0,
        approvedToday: sc["Approved"] ?? 0,
    };
}

export function useDashboardSummary() {
    return useQuery({
        queryKey: queryKeys.dashboard.summary,
        queryFn: async () => {
            const res = await apiClient.get("/api/dashboard/summary");
            const body = res.data;
            // Backend wraps in { success, data, message }
            const raw: DashboardSummaryResponse = body.data ?? body;
            return mapSummaryData(raw);
        },
        staleTime: 1000 * 60, // 1 minute — matches global default; explicit for clarity
    });
}
