export type LoanStatus = "Draft" | "Pending" | "Under Review" | "Approved" | "Rejected" | "Disbursed";

export interface LoanMonitoringRecord {
    /**
     * Numeric primary key from `LoanApplication.Id`. Server-backed rows
     * always carry this — the row-click handler uses it to open the
     * details drawer for the matching loan. Kept `id?: number` (rather
     * than required) as a defensive guard so a future partial record
     * (e.g. an optimistic insert) doesn't crash the click handler.
     */
    id?: number;
    formNumber: string;
    branchCode: string;
    customerName: string;
    loanType: string;
    product: string;
    loanAmount: number;
    applicationDate: string; // ISO Date
    status: LoanStatus;
    lastActionDate: string;  // ISO Date
    timeLapsedHours: number; // Calculated by backend or frontend
    lastApprover: string;
}

export interface MonitoringFilters {
    search: string;
    dateRange: { from: Date | undefined; to: Date | undefined };
    status: LoanStatus[];
    branchCode: string;
}