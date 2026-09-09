import { apiClient } from "@/src/lib/apiClient";
import {
    unwrapApiData,
    type ApiResponse,
    type LoanSubmissionPayload,
    type LoanSubmissionResponse,
} from "./types";

/**
 * POST /api/loans — persists the full wizard payload and mints one LAM ID per
 * selected loan number.
 *
 * `idempotencyKey` makes retries safe: the same key replays the stored
 * response (200) instead of creating a second application group. The caller
 * owns the key lifecycle (see useCreateLoan).
 */
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

/**
 * Loan API surface — re-exported as a namespaced object so call sites
 * read like `loanApi.createLoan(payload)` rather than reaching into a
 * flat module. Today it just wraps the underlying submission call, but
 * keeping the indirection leaves room for read-side methods (e.g.
 * `loanApi.getMonitoring()`) to land here later without churning every
 * caller.
 */
export const loanApi = {
    /**
     * Create a new loan application group. Same on-the-wire contract as
     * {@link submitLoanApplication} — the namespaced form is preferred in
     * feature code (e.g. `useCreateLoan`) because it reads like a domain
     * API rather than a free function.
     *
     * @param payload      Full wizard payload.
     * @param idempotencyKey  GUID that dedupes retries. The hook caller
     *                        owns the lifecycle — mint once per logical
     *                        submission, rotate after success.
     */
    createLoan: (
        payload: LoanSubmissionPayload,
        idempotencyKey: string
    ): Promise<LoanSubmissionResponse> =>
        submitLoanApplication(payload, idempotencyKey),
};

/**
 * One entry on a loan's vertical audit timeline. Mirrors
 * `LoanHistoryEntryResponse` on the backend (Features/Loans/LoanSubmissionDtos.cs).
 *
 * `actionBy` is the resolved FullName of the acting user (server-side join
 * through `ActionByUser`); `fromStatus` / `toStatus` are nullable because
 * the very first `Created` row has no originating status.
 */
export interface LoanHistoryEntry {
    id: number;
    actionBy: string;
    action: string;
    fromStatus?: string;
    toStatus?: string;
    comments?: string;
    /** ISO-8601 UTC (e.g. `"2026-09-09T08:00:00Z"`). */
    actionDate: string;
}

/**
 * GET /api/loans/{applicationId}/history
 *
 * Returns the chronological audit-trail list for a single loan. Authorization
 * is two-stage on the server: callers with `loans.view` see any loan; others
 * only see loans they created (`CreatedById == userId`). Unauthorized calls
 * surface here as an axios error with `response.status === 403`; a missing
 * loan surfaces as `response.status === 404` with the `ApiResponse` envelope
 * (`success: false, message: "Loan not found"`). Both are left to the caller
 * to render.
 */
export async function getLoanHistory(
    applicationId: number
): Promise<LoanHistoryEntry[]> {
    const res = await apiClient.get<ApiResponse<LoanHistoryEntry[]>>(
        `/api/loans/${applicationId}/history`
    );
    return unwrapApiData(res.data);
}
