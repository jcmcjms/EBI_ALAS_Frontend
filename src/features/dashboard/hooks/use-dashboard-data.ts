/**
 * Dashboard feature hooks — TanStack Query wrappers.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/src/lib/queryKeys";
import { BRANCHES } from "@/src/lib/api/types";
import { getDashboardOverview, type DashboardOverviewDto } from "../api/dashboard";
import type {
    DashboardData,
    LoanStatus,
} from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Backend status keys → the display union the widgets' badge styles key off. */
const STATUS_LABELS: Record<string, LoanStatus> = {
    ForRecommendation: "For Recommendation",
    ForChecking: "For Checking",
    ForApproval: "For Approval",
    ForRevision: "For Revision",
    ForIncompleteDocuments: "For Incomplete Documents",
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
            clientName: p.clientName,
            encoderName: p.encoderName,
        })),
        nowServing: o.nowServing.map((n) => ({
            number: n.number,
            checker: n.checker,
            lamId: n.lamId,
            isActive: n.isActive,
        })),
        pushBacks: o.pushBacks.map((p) => ({
            number: p.number,
            lamId: p.lamId,
            branch: branchNameOf(p.branchCode),
            reason: p.reason,
            date: p.pushedBackAtUtc,
        })),
        approvedLoans: o.approvedLoans.map((a) => ({
            fullName: a.fullName,
            lamId: a.lamId,
            branch: branchNameOf(a.branchCode),
            date: a.approvedAtUtc,
        })),
        weeklyTrend: o.weeklyTrend.map((t) => ({
            day: t.day,
            approved: t.approved,
            pushBacks: t.pushBacks,
        })),
        incompleteDocsQueue: (o.documentQueue ?? []).map((d) => ({
            id: d.id,
            position: d.position,
            lamId: d.lamId,
            branch: branchNameOf(d.branchCode),
            waitingSinceUtc: d.waitingSinceUtc,
            missingCount: d.missingCount,
            clientName: d.clientName,
            encoderName: d.encoderName,
            flaggedByName: d.flaggedByName,
            flaggedAt: d.flaggedAt,
        })),
        fetchedAt: o.generatedAtUtc,
    };
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useDashboardData() {
    return useQuery({
        queryKey: queryKeys.dashboard.full,
        queryFn: async () => mapOverview(await getDashboardOverview()),
        refetchInterval: 30_000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        staleTime: 10_000,
    });
}
