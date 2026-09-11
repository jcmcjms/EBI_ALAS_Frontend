import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse } from "./types";

export interface DashboardOverviewDto {
    kpis: {
        totalPending: number;
        pendingDeltaFromYesterday: number;
        nowServing: number;
        pushBacksToday: number;
        approvedToday: number;
        approvedVsAvgPercent: number;
    };
    pendingQueue: { position: number; lamId: string; branchCode: string; status: string; waitingSinceUtc: string }[];
    nowServing: { number: number; checker: string; lamId: string; isActive: boolean }[];
    pushBacks: { number: number; lamId: string; branchCode: string; reason: string; pushedBackAtUtc: string }[];
    approvedLoans: { fullName: string; lamId: string; branchCode: string; approvedAtUtc: string }[];
    weeklyTrend: { day: string; approved: number; pushBacks: number }[];
    generatedAtUtc: string;
}

export async function getDashboardOverview(): Promise<DashboardOverviewDto> {
    const res = await apiClient.get<ApiResponse<DashboardOverviewDto>>("/api/dashboard/overview");
    return unwrapApiData(res.data);
}