export type LoanStatus = "Draft" | "Pending" | "Under Review" | "Approved" | "Rejected" | "Disbursed";

export interface LoanMonitoringRecord {
    /**
     * Numeric primary key from `LoanApplication.Id`. Optional because the
     * local monitoring table is currently backed by dummy data that does
     * not yet carry a numeric id — until the table is migrated to the
     * real backend, rows from the dummy dataset have no `id` and the
     * row-click handler ignores them. Deep-link flows that supply
     * `?id=<n>` via `useSearchParams` open the drawer regardless.
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