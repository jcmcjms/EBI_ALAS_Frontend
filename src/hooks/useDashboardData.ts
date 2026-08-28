import { useQuery } from "@tanstack/react-query";
import type {
    DashboardSummary,
    PendingQueueItem,
    NowServingItem,
    PushBackItem,
    ApprovedLoanItem,
    WeeklyTrendPoint,
} from "@/src/pages/dashboard/types";

export interface DashboardData {
    summary: DashboardSummary;
    pendingQueue: PendingQueueItem[];
    nowServing: NowServingItem[];
    pushBacks: PushBackItem[];
    approvedLoans: ApprovedLoanItem[];
    weeklyTrend: WeeklyTrendPoint[];
    fetchedAt: string;
}

// Import dummy data
import {
    dashboardSummary,
    pendingQueueData,
    nowServingData,
    pushBackData,
    approvedLoansData,
    weeklyTrend,
} from "@/src/pages/dashboard/data/dummy-data";

/**
 * Mock fetch function that returns dummy data.
 * Replace with real API call when backend is ready:
 *
 * async function fetchDashboardData(): Promise<DashboardData> {
 *     const { data } = await apiClient.get("/api/dashboard");
 *     return data.data;
 * }
 */
async function fetchDashboardData(): Promise<DashboardData> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Generate fresh relative timestamps on each fetch
    const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

    return {
        summary: dashboardSummary,
        pendingQueue: pendingQueueData.map((item) => ({
            ...item,
            date: minutesAgo(
                item.position === 1 ? 195 : item.position === 2 ? 160 : item.position === 3 ? 130 : item.position === 4 ? 95 : item.position === 5 ? 50 : 25
            ),
        })),
        nowServing: nowServingData,
        pushBacks: pushBackData.map((item, idx) => ({
            ...item,
            date: minutesAgo([210, 175, 140, 85, 30][idx]),
        })),
        approvedLoans: approvedLoansData.map((item, idx) => ({
            ...item,
            date: minutesAgo([200, 155, 125, 90, 40][idx]),
        })),
        weeklyTrend,
        fetchedAt: new Date().toISOString(),
    };
}

export function useDashboardData() {
    return useQuery({
        queryKey: ["dashboard"],
        queryFn: fetchDashboardData,
        refetchInterval: 30_000, // Auto-refetch every 30 seconds
        refetchIntervalInBackground: false, // Don't refetch when tab is hidden
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        staleTime: 10_000, // Consider data fresh for 10 seconds
    });
}