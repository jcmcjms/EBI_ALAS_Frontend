import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import type { LoanMonitoringRecord, MonitoringFilters } from "@/src/pages/loans/monitoring/types";

interface PaginationState { pageIndex: number; pageSize: number; }
interface SortingState { id: string; desc: boolean; }

/** Backend loan shape from GET /api/loans */
interface BackendLoan {
    id: number;
    formNumber: string;
    branchCode: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    product: string;
    purpose?: string;
    proposedAmount: number;
    status: string;
    applicationDate: string;
    lastActionDate: string;
    createdByName: string;
}

/** Map backend status to frontend status */
function mapStatus(status: string): LoanMonitoringRecord["status"] {
    const map: Record<string, LoanMonitoringRecord["status"]> = {
        "Draft": "Draft",
        "ForRecommendation": "Pending",
        "ForChecking": "Under Review",
        "ForApproval": "Under Review",
        "Approved": "Approved",
        "Rejected": "Rejected",
        "ForRevision": "Under Review",
        "ForDisbursement": "Approved",
        "Disbursed": "Disbursed",
        "OnGoing": "Pending",
    };
    return map[status] ?? "Pending";
}

/** Map backend loan to frontend monitoring record */
function mapLoan(loan: BackendLoan): LoanMonitoringRecord {
    const customerName = loan.middleName
        ? `${loan.firstName} ${loan.middleName} ${loan.lastName}`
        : `${loan.firstName} ${loan.lastName}`;

    const appDate = new Date(loan.applicationDate);
    const lastAction = new Date(loan.lastActionDate);
    const timeLapsedHours = Math.round((Date.now() - lastAction.getTime()) / 3_600_000);

    return {
        formNumber: loan.formNumber,
        branchCode: loan.branchCode,
        customerName,
        loanType: "New Loan",
        product: loan.product,
        loanAmount: loan.proposedAmount,
        applicationDate: appDate.toISOString(),
        status: mapStatus(loan.status),
        lastActionDate: lastAction.toISOString(),
        timeLapsedHours: Math.max(0, timeLapsedHours),
        lastApprover: loan.createdByName,
    };
}

export function useLoanMonitoring(
    filters: MonitoringFilters,
    pagination: PaginationState,
    sorting: SortingState[]
) {
    return useQuery({
        queryKey: ["loan-monitoring", filters, pagination, sorting],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set("page", String(pagination.pageIndex + 1));
            params.set("pageSize", String(pagination.pageSize));

            if (filters.search) {
                params.set("search", filters.search);
            }
            if (filters.status.length > 0) {
                params.set("status", filters.status.join(","));
            }
            if (filters.branchCode && filters.branchCode !== "all") {
                params.set("branchCode", filters.branchCode);
            }
            if (sorting.length > 0) {
                params.set("sortBy", sorting[0].id);
                params.set("sortDesc", String(sorting[0].desc));
            }

            const res = await apiClient.get(`/api/loans?${params.toString()}`);
            const body = res.data;

            // Backend wraps in { success, data: { items, totalCount, ... } }
            const paged = body.data ?? body;
            const items: BackendLoan[] = paged.items ?? [];

            return {
                data: items.map(mapLoan),
                rowCount: paged.totalCount ?? items.length,
            };
        },
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}
