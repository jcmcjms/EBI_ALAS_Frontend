/**
 * Dashboard types — view-models consumed by the dashboard widgets.
 */

export type LoanStatus =
    | "On Going"
    | "For Recommendation"
    | "For Checking"
    | "For Approval"
    | "Approved"
    | "Rejected"
    | "Cancelled"
    | "Expired"
    | "For Revision"
    | "For Disbursement"
    | "Disbursed"
    | "For Incomplete Documents";

export interface PendingQueueItem {
    position: number;
    lamId: string;
    branch: string;
    status: LoanStatus;
    /** Raw backend workflow status (e.g. "ForRecommendation") for SLA lookup. */
    statusKey: string;
    date: string;
    clientName: string;
    encoderName: string;
}

export interface NowServingItem {
    number: number;
    checker: string;
    lamId: string;
    isActive: boolean;
}

export interface PushBackItem {
    number: number;
    lamId: string;
    branch: string;
    date: string;
    reason: string;
}

export interface ApprovedLoanItem {
    branch: string;
    lamId: string;
    date: string;
    fullName: string;
}

export interface DashboardSummary {
    totalPending: number;
    pendingDeltaFromYesterday: number;
    nowServing: number;
    pushBacksToday: number;
    approvedToday: number;
    approvedVsAvgPercent: number;
}

export interface WeeklyTrendPoint {
    day: string;
    approved: number;
    pushBacks: number;
}

export interface IncompleteDocsQueueItem {
    id: number;
    position: number;
    lamId: string;
    branch: string;
    waitingSinceUtc: string;
    missingCount: number;
    clientName: string;
    encoderName: string;
    flaggedByName?: string;
    flaggedAt?: string;
}

export interface DashboardData {
    summary: DashboardSummary;
    pendingQueue: PendingQueueItem[];
    nowServing: NowServingItem[];
    pushBacks: PushBackItem[];
    approvedLoans: ApprovedLoanItem[];
    weeklyTrend: WeeklyTrendPoint[];
    incompleteDocsQueue: IncompleteDocsQueueItem[];
    fetchedAt: string;
}
