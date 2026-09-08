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
 * owns the key lifecycle (see useLoanSubmission).
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