import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/src/lib/queryKeys";
import { getDashboardOverview, type DashboardOverviewDto } from "@/src/lib/api/dashboard";
import { BRANCHES } from "@/src/lib/api/types";
import type {
    DashboardSummary, LoanStatus, PendingQueueItem, NowServingItem,
    PushBackItem, ApprovedLoanItem, WeeklyTrendPoint,
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

/** Backend status keys → the display union the widgets' badge styles key off. */
const STATUS_LABELS: Record<string, LoanStatus> = {
    ForRecommendation: "For Recommendation",
    ForChecking: "For Checking",
    ForApproval: "For Approval",
    ForRevision: "For Revision",
    ForDisbursement: "For Disbursement",
    Disbursed: "Disbursed",
    OnGoing: "On Going",
    Approved: "Approved",
    Rejected: "Rejected",
};

const branchNameOf = (code: string) =>
    BRANCHES.find((b) => b.code === code)?.name ?? `Branch ${code}`;

/** DTO → existing view-models so the five widgets stay untouched. */
function mapOverview(o: DashboardOverviewDto): DashboardData {
    return {
        summary: {
            totalPending: o.kpis.totalPending,
            pendingDeltaFromYesterday: o.kpis.pendingDeltaFromYesterday,
            nowServing: o.kpis.nowServing,
            pushBacksToday: o.kpis.pushBacksToday,
            approvedToday: o.kpis.approvedToday,
            approvedVsAvgPercent: o.kpis.approvedVsAvgPercent,
        },
        pendingQueue: o.pendingQueue.map((p) => ({
            position: p.position,
            lamId: p.lamId,
            branch: branchNameOf(p.branchCode),
            status: STATUS_LABELS[p.status] ?? "On Going",
            statusKey: p.status,
            date: p.waitingSinceUtc,
        })),
        nowServing: o.nowServing.map((n) => ({
            number: n.number, checker: n.checker, lamId: n.lamId, isActive: n.isActive,
        })),
        pushBacks: o.pushBacks.map((p) => ({
            number: p.number, lamId: p.lamId, branch: branchNameOf(p.branchCode),
            reason: p.reason, date: p.pushedBackAtUtc,
        })),
        approvedLoans: o.approvedLoans.map((a) => ({
            fullName: a.fullName, lamId: a.lamId, branch: branchNameOf(a.branchCode),
            date: a.approvedAtUtc,
        })),
        weeklyTrend: o.weeklyTrend.map((t) => ({
            day: t.day, approved: t.approved, pushBacks: t.pushBacks,
        })),
        fetchedAt: o.generatedAtUtc,
    };
}

export function useDashboardData() {
    return useQuery({
        queryKey: queryKeys.dashboard.full,
        queryFn: async () => mapOverview(await getDashboardOverview()),
        // Monitoring UI: keep it live while the page is open.
        refetchInterval: 30_000,
        // Hidden tabs don't need live data; on return, focus-refetch catches up
        // instantly — cheaper and kinder than background polling.
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        staleTime: 10_000,
    });
}