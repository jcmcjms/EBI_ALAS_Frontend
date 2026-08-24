export type LoanStatus = "Draft" | "Pending" | "Under Review" | "Approved" | "Rejected" | "Disbursed";

export interface LoanMonitoringRecord {
    formNumber: string;
    branchCode: string;
    customerName: string;
    clientType: string;
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