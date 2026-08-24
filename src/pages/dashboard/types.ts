export type LoanStatus = "On Going" | "For Recommendation" | "For Checking" | "For Approval" | "Approved" | "Rejected" | "Cancelled" | "Expired" | "For Revision" | "For Disbursement" | "Disbursed";

export interface PendingQueueItem {
    position: number;
    lamId: string;
    branch: string;
    status: LoanStatus;
    date: string;
}

export interface NowServingItem {
    number: number;
    checker: string;
    lamId: string;
}

export interface PushBackItem {
    number: number;
    lamId: string;
    branch: string;
    date: string;
}

export interface ApprovedLoanItem {
    branch: string;
    lamId: string;
    date: string;
    fullName: string;
}

export interface DashboardSummary {
    totalPending: number;
    nowServing: number;
    pushBacksToday: number;
    approvedToday: number;
}