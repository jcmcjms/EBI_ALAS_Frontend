import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/lib/queryKeys";
import type { LoanMonitoringRecord, MonitoringFilters } from "@/src/pages/loans/monitoring/types";

interface PaginationState { pageIndex: number; pageSize: number; }
interface SortingState { id: string; desc: boolean; }

/** Backend loan shape from GET /api/loans (mirrors LoanMonitoringDto on the server). */
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

/**
 * Map backend status → frontend chip label.
 *
 * The backend stores workflow status as one of:
 *   Draft, ForRecommendation, ForChecking, ForApproval,
 *   Approved, Rejected, ForRevision, ForDisbursement,
 *   Disbursed, OnGoing.
 *
 * The frontend collapses these to a smaller set of labels that the table
 * renders (`Draft`, `Pending`, `Under Review`, `Approved`, `Rejected`,
 * `Disbursed`). This map is the single source of truth for that
 * collapse.
 */
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

/**
 * Reverse map: FE filter chip label → backend status names.
 *
 * Used by the table's status filter — the chip sends labels like
 * "Pending" / "Under Review" but the backend's `WHERE Status IN (...)`
 * clause expects the real status names ("ForRecommendation", "OnGoing",
 * etc.). Without this map, picking "Pending" from the toolbar would
 * silently return zero rows because the backend has no row with status
 * == "Pending".
 *
 * Multi-valued: a single FE label can correspond to several backend
 * statuses (e.g. "Pending" = "ForRecommendation" + "OnGoing"). The
 * returned array is joined with commas by the caller before being
 * placed in the URL — the backend already splits on comma.
 */
function statusLabelToBackendStatuses(
    label: LoanMonitoringRecord["status"]
): string[] {
    switch (label) {
        case "Draft":         return ["Draft"];
        case "Pending":       return ["ForRecommendation", "OnGoing"];
        case "Under Review":  return ["ForChecking", "ForApproval", "ForRevision"];
        case "Approved":      return ["Approved", "ForDisbursement"];
        case "Rejected":      return ["Rejected"];
        case "Disbursed":     return ["Disbursed"];
    }
}

/**
 * Map FE column id (from react-table's `sorting[0].id`) → backend sort
 * column. The backend whitelists exactly four sort columns (see
 * GetLoansEndpoint.cs); any unmapped FE column id falls through to the
 * server default (`applicationDate DESC`), which keeps the table stable
 * but means clicking a header the backend can't sort on is a no-op.
 *
 * Returning `undefined` means "do not send a `sortBy` param" so the
 * backend picks its default — same as before this map existed, but
 * explicit.
 */
function sortColumnIdToBackendSortId(columnId: string): string | undefined {
    const map: Record<string, string> = {
        // FE column id  →  backend sortBy
        applicationDate:   "applicationdate",
        loanAmount:        "proposedamount",
        status:            "status",
        customerName:      "customername",
        // Columns below have no server-side sort equivalent — fall through
        // to the default by omitting sortBy.
        // formNumber, branchCode, loanType, product, timeLapsedHours, lastApprover
    };
    return map[columnId];
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
        id: loan.id,
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

/**
 * Server-backed loan monitoring hook. Drives `GET /api/loans` with the
 * table's filter / pagination / sorting state and returns the
 * page-shaped data react-table consumes.
 *
 * Server does ALL of:
 *   - Filtering (search, status multi-select, branch)
 *   - Sorting (whitelisted columns only)
 *   - Counting (totalCount → rowCount)
 *   - Pagination (page index + size)
 *
 * The hook therefore passes pagination/sorting/filters straight
 * through to the URL; client-side filter/sort/paginate over a dummy
 * dataset is gone.
 */
export function useLoanMonitoring(
    filters: MonitoringFilters,
    pagination: PaginationState,
    sorting: SortingState[]
) {
    return useQuery({
        queryKey: queryKeys.loans.monitoring(filters, pagination, sorting),
        queryFn: async () => {
            const params = new URLSearchParams();
            // Page index is 0-based in react-table; backend is 1-based.
            params.set("page", String(pagination.pageIndex + 1));
            params.set("pageSize", String(pagination.pageSize));

            if (filters.search) {
                params.set("search", filters.search);
            }

            // Status: reverse-map each FE label to one or more backend
            // status names, then dedupe + join with comma. The backend
            // splits on comma and applies an `IN (...)` predicate.
            if (filters.status.length > 0) {
                const backendStatuses = Array.from(new Set(
                    filters.status.flatMap(statusLabelToBackendStatuses)
                ));
                if (backendStatuses.length > 0) {
                    params.set("status", backendStatuses.join(","));
                }
            }

            if (filters.branchCode && filters.branchCode !== "all") {
                params.set("branchCode", filters.branchCode);
            }

            // Sorting: translate FE column id → backend whitelisted id.
            // Omit `sortBy` when the column has no server-side sort
            // equivalent (e.g. "branchCode") — the backend falls back
            // to its default ApplicationDate DESC.
            if (sorting.length > 0) {
                const backendSortId = sortColumnIdToBackendSortId(sorting[0].id);
                if (backendSortId) {
                    params.set("sortBy", backendSortId);
                    params.set("sortDesc", String(sorting[0].desc));
                }
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
        // 2 minutes — monitoring data is transactional (workflow state
        // changes frequently) but a refetch storm on every render is
        // wasteful. Invalidation from useCreateLoan overrides this when
        // a new loan is submitted.
        staleTime: 1000 * 60 * 2,
    });
}
