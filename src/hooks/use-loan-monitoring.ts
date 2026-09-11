import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/lib/queryKeys";
import type {
    ApiResponse,
    CreatedLoanSummary,
    LoanSubmissionResponse,
    PagedResult,
} from "@/src/lib/api/types";
import type { LoanMonitoringRecord, MonitoringFilters } from "@/src/pages/loans/monitoring/types";
import type { LoanStatus } from "@/src/lib/loan-status";

interface PaginationState { pageIndex: number; pageSize: number; }
interface SortingState { id: string; desc: boolean; }

// ─── Sort column mapping ─────────────────────────────────────────────────────

/**
 * FE column id → backend whitelisted sort param.
 *
 * The backend lowercases the incoming `sortBy` internally, so the casing
 * here is cosmetic — we keep it lowercase to match the backend's own
 * docs. Any column not listed here has no server-side sort; omitting
 * `sortBy` lets the backend fall back to ApplicationDate DESC.
 */
const SORT_COLUMN_MAP: Record<string, string> = {
    applicationDate: "applicationdate",
    loanAmount: "proposedamount",
    status: "status",
    customerName: "customername",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Safe date parse. The previous mapper called `new Date(undefined)`
 * which threw RangeError inside queryFn and killed the entire query.
 */
function parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * One `CreatedLoanSummary` (one row inside an ApplicationGroupNo group) →
 * one monitoring table record. Defensive against the POST-shaped
 * response where list-view enrichment fields are null.
 *
 * Status is passed through verbatim from the backend — never collapsed
 * into generic buckets. The old `UI_STATUS_BY_BACKEND_STATUS` map hid
 * operationally critical distinctions (e.g. ForRevision vs ForChecking
 * both read "Under Review", so a returned file looked like progress).
 */
function toMonitoringRecord(loan: CreatedLoanSummary): LoanMonitoringRecord {
    const nameParts = [loan.firstName, loan.middleName, loan.lastName, loan.suffix]
        .filter((part): part is string => Boolean(part));

    const appliedAt = parseDate(loan.applicationDate);
    const lastActionAt = parseDate(loan.lastActionDate) ?? appliedAt ?? new Date();

    return {
        id: loan.id,
        formNumber: loan.lamId,
        branchCode: loan.branchCode ?? "—",
        customerName: nameParts.join(" ") || "Unknown client",
        loanType: loan.creationTypeLabel ?? "New Loan",
        product: loan.product ?? loan.productCode,
        loanAmount: loan.proposedAmount,
        applicationDate: (appliedAt ?? new Date()).toISOString(),
        status: (loan.status as LoanStatus) ?? "Draft",
        lastActionDate: lastActionAt.toISOString(),
        timeLapsedHours: Math.max(0, Math.round((Date.now() - lastActionAt.getTime()) / 3_600_000)),
        // Prefer the server-resolved last handler; fall back to the creator for
        // POST-shaped responses / legacy rows with no audit actions yet.
        lastActionBy: loan.lastActionByName ?? loan.createdByName ?? "—",
        lastActionVerb: loan.lastAction ?? null,
        createdById: loan.createdById ?? null,
    };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

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
 * Wire shape:
 *   The backend returns `ApiResponse<PagedResult<LoanSubmissionResponse>>`
 * where each `LoanSubmissionResponse` groups its loans by
 * `ApplicationGroupNo`. The monitoring table wants a flat array, so
 * we flatten via `flatMap(group => group.loans.map(toMonitoringRecord))`.
 */
export function useLoanMonitoring(
    filters: MonitoringFilters,
    pagination: PaginationState,
    sorting: SortingState[]
) {
    const query = useQuery({
        queryKey: queryKeys.loans.monitoring(filters, pagination, sorting),
        queryFn: async (): Promise<{ records: LoanMonitoringRecord[]; rowCount: number }> => {
            const params: Record<string, string> = {
                page: String(pagination.pageIndex + 1),
                pageSize: String(pagination.pageSize),
            };

            if (filters.search) params.search = filters.search;

            // Raw statuses go straight through — no collapsing into generic buckets.
            // The backend's ?status= filter already accepts comma-separated raw statuses.
            if (filters.status.length > 0) {
                params.status = filters.status.join(",");
            }

            if (filters.branchCode && filters.branchCode !== "all") {
                params.branchCode = filters.branchCode;
            }

            if (filters.dateRange.from) params.fromDate = filters.dateRange.from.toISOString();
            if (filters.dateRange.to) params.toDate = filters.dateRange.to.toISOString();

            if (sorting.length > 0) {
                const backendSortId = SORT_COLUMN_MAP[sorting[0].id];
                if (backendSortId) {
                    params.sortBy = backendSortId;
                    params.sortDesc = String(sorting[0].desc);
                }
            }

            const { data: envelope } = await apiClient.get<ApiResponse<PagedResult<LoanSubmissionResponse>>>(
                "/api/loans",
                { params },
            );

            // Surface soft failures (HTTP 200 + success:false) as query
            // errors so the table's retry banner handles them like any
            // other failure.
            if (!envelope.success || !envelope.data) {
                throw new Error(envelope.message || "Loan monitoring request failed");
            }

            const page = envelope.data;

            // GET /api/loans groups rows by ApplicationGroupNo (one item
            // per submission). The table renders one row per LOAN, so flatten.
            const records = page.items.flatMap((group) =>
                (group.loans ?? []).map(toMonitoringRecord),
            );

            return { records, rowCount: page.totalCount };
        },
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 2,
    });

    // ── View-model contract for MonitoringTable ─────────────────────────
    // The table destructures `data` as the row ARRAY and `rowCount` as a
    // top-level number. Returning the queryFn payload nested (as earlier
    // iterations did) made rowCount fall back to 0 ("0 entries") and handed
    // react-table a non-array, which silently rendered zero rows.
    return {
        ...query,
        data: query.data?.records ?? [],
        rowCount: query.data?.rowCount ?? 0,
    };
}
