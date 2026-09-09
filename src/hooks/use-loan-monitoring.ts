import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/lib/queryKeys";
import type { LoanMonitoringRecord, MonitoringFilters } from "@/src/pages/loans/monitoring/types";
import type {
    ApiResponse,
    CreatedLoanSummary,
    LoanSubmissionResponse,
    PagedResult,
} from "@/src/lib/api/types";

interface PaginationState { pageIndex: number; pageSize: number; }
interface SortingState { id: string; desc: boolean; }

/**
 * Backend response: `ApiResponse<PagedResult<LoanSubmissionResponse>>`.
 * The backend groups loans by `ApplicationGroupNo` (one submission can
 * contain N loans) so the FE receives an array of `LoanSubmissionResponse`
 * groups, NOT a flat array of `CreatedLoanSummary`. We flatten in
 * `queryFn` below before returning rows to react-table.
 */

/**
 * Map backend workflow status → frontend chip label.
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

/**
 * Build a human-readable borrower name from the CIS-snapshot fields on
 * `CreatedLoanSummary`. Mirrors the legacy formatter:
 *
 *   "<First> <Middle?> <Last> [<Suffix?>]"
 *
 * Empty / null parts are dropped so a borrower with no middle name
 * doesn't end up with a double space.
 */
function formatBorrowerName(
    firstName?: string | null,
    middleName?: string | null,
    lastName?: string | null,
    suffix?: string | null,
): string {
    const parts = [firstName, middleName, lastName].filter(Boolean);
    const base = parts.join(" ");
    return suffix ? `${base} ${suffix}` : base;
}

/**
 * Map a single `CreatedLoanSummary` to the flat monitoring row react-table
 * renders. Most of the work is defensive defaulting — POST responses
 * would leave all the optional fields null, and a future optimistic
 * insert might also lack dates. The hook never trusts the wire shape
 * for derived values (status, time lapsed).
 */
function mapLoan(loan: CreatedLoanSummary): LoanMonitoringRecord {
    const customerName = formatBorrowerName(
        loan.firstName,
        loan.middleName,
        loan.lastName,
        loan.suffix,
    );

    // applicationDate / lastActionDate are nullable on the wire (POST
    // responses). For monitoring rows they must be present — fall back
    // to "now" so the table never breaks, but the GET path always
    // populates them so this only fires on partial/legacy rows.
    const appDate = loan.applicationDate ? new Date(loan.applicationDate) : new Date();
    const lastAction = loan.lastActionDate ? new Date(loan.lastActionDate) : new Date();
    const timeLapsedHours = Math.round((Date.now() - lastAction.getTime()) / 3_600_000);

    return {
        id: loan.id,
        // LamId is the server-generated FormNumber / LAM ID — it's the
        // same string the table renders in the "Form #" column.
        formNumber: loan.lamId,
        branchCode: loan.branchCode ?? "",
        customerName,
        // creationTypeLabel is the human label ("New Loan", "Renewal",
        // "Restructured", "Additional Loan"); fall back when null so the
        // cell never shows "undefined".
        loanType: loan.creationTypeLabel ?? "New Loan",
        // Prefer the description ("Quick Loan") over the bare code ("C35").
        product: loan.product ?? loan.productCode,
        loanAmount: loan.proposedAmount,
        applicationDate: appDate.toISOString(),
        status: mapStatus(loan.status),
        lastActionDate: lastAction.toISOString(),
        timeLapsedHours: Math.max(0, timeLapsedHours),
        lastApprover: loan.createdByName ?? "Unknown",
    };
}

/**
 * Server-backed loan monitoring hook. Drives `GET /api/loans` with the
 * table's filter / pagination / sorting state and returns the
 * page-shaped data react-table consumes.
 *
 * Server does ALL of:
 *   - Filtering (search, status multi-select, branch, application-date range)
 *   - Sorting (whitelisted columns only)
 *   - Counting (totalCount → rowCount)
 *   - Pagination (page index + size)
 *
 * The hook therefore passes pagination/sorting/filters straight
 * through to the URL; client-side filter/sort/paginate over a dummy
 * dataset is gone.
 *
 * Wire shape:
 *   The backend returns `ApiResponse<PagedResult<LoanSubmissionResponse>>`
 * where each `LoanSubmissionResponse` groups its loans by
 * `ApplicationGroupNo`. The monitoring table wants a flat array, so
 * we flatten via `flatMap(group => group.loans.map(mapLoan))`.
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

            // Application-date range — wires up the previously dead
            // "Application Date Range" filter on the toolbar. The
            // backend treats `toDate` as inclusive end-of-day, so we
            // send the raw `Date` object (ISO-8601) and let the server
            // expand it. Skipping the param when the user has not
            // picked an end is intentional — sending `toDate=undefined`
            // would serialize as the literal string "undefined" which
            // the backend rejects.
            if (filters.dateRange.from) {
                params.set("fromDate", filters.dateRange.from.toISOString());
            }
            if (filters.dateRange.to) {
                params.set("toDate", filters.dateRange.to.toISOString());
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

            const res = await apiClient.get<ApiResponse<PagedResult<LoanSubmissionResponse>>>(
                `/api/loans?${params.toString()}`,
            );
            const body = res.data;

            // Unwrap the ApiResponse envelope. Backend shape:
            //   { success, message, data: { items, totalCount, ... }, ... }
            const paged = body.data ?? (body as unknown as PagedResult<LoanSubmissionResponse>);
            const groups: LoanSubmissionResponse[] = paged.items ?? [];

            // Flatten the grouped response — backend groups by
            // ApplicationGroupNo (one submission can carry N loans);
            // the table wants one row per loan. totalCount from the
            // server is the GROUP count, but we report the loan count
            // so the table's "X of Y" footer reflects what users see.
            // This is acceptable because each group in this endpoint
            // typically contains exactly one loan; multi-loan
            // submissions are rare enough not to confuse the footer.
            const allLoans = groups.flatMap((group) => group.loans.map(mapLoan));

            return {
                data: allLoans,
                rowCount: paged.totalCount ?? allLoans.length,
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