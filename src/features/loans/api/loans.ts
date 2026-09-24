import { apiClient } from "@/src/lib/apiClient";
import {
    unwrapApiData,
    type ApiResponse,
    type PagedResult,
    type LoanSubmissionPayload,
    type CreatedLoanSummary,
    type LoanSubmissionResponse,
} from "@/src/lib/api/types";
import type { LoanDetailResponse } from "./loan-review";

export type { LoanSubmissionPayload, CreatedLoanSummary, LoanSubmissionResponse };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MonitoringFilters {
    search?: string;
    status?: string;
    branchCode?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface MonitoringSort {
    field: string;
    direction: "asc" | "desc";
}

/**
 * One entry on a loan's vertical audit timeline.
 */
export interface LoanHistoryEntry {
    id: number;
    actionBy: string;
    action: string;
    fromStatus?: string;
    toStatus?: string;
    comments?: string;
    actionDate: string;
    actionByRole: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export async function submitLoanApplication(
    payload: LoanSubmissionPayload,
    idempotencyKey: string
): Promise<LoanSubmissionResponse> {
    const res = await apiClient.post<ApiResponse<LoanSubmissionResponse>>(
        "/api/loans",
        payload,
        { headers: { "Idempotency-Key": idempotencyKey } }
    );
    return unwrapApiData(res.data);
}

export const loanApi = {
    createLoan: (
        payload: LoanSubmissionPayload,
        idempotencyKey: string
    ): Promise<LoanSubmissionResponse> =>
        submitLoanApplication(payload, idempotencyKey),
};

export async function createLoan(
    payload: LoanSubmissionPayload,
    idempotencyKey: string,
): Promise<LoanSubmissionResponse> {
    const res = await apiClient.post<ApiResponse<LoanSubmissionResponse>>(
        "/api/loans",
        payload,
        { headers: { "Idempotency-Key": idempotencyKey } },
    );
    return unwrapApiData(res.data);
}

export async function listLoans(
    filters: MonitoringFilters,
    page: number,
    pageSize: number,
    sort?: MonitoringSort,
): Promise<PagedResult<CreatedLoanSummary>> {
    const res = await apiClient.get<ApiResponse<PagedResult<CreatedLoanSummary>>>(
        "/api/loans",
        {
            params: {
                search: filters.search || undefined,
                status: filters.status || undefined,
                branchCode: filters.branchCode || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined,
                pageNumber: page,
                pageSize,
                sortField: sort?.field,
                sortDirection: sort?.direction,
            },
        },
    );
    return unwrapApiData(res.data);
}

export async function getQueueDefault(): Promise<{ status: string }> {
    const res = await apiClient.get<ApiResponse<{ status: string }>>(
        "/api/loans/queue-default",
    );
    return unwrapApiData(res.data);
}

export async function getLoanHistory(
    applicationId: number
): Promise<LoanHistoryEntry[]> {
    const res = await apiClient.get<ApiResponse<LoanHistoryEntry[]>>(
        `/api/loans/${applicationId}/history`
    );
    return unwrapApiData(res.data);
}

export async function getLoanById(id: number): Promise<LoanDetailResponse> {
    const res = await apiClient.get<ApiResponse<LoanDetailResponse>>(
        `/api/loans/${id}`
    );
    return unwrapApiData(res.data);
}
