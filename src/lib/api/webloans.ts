import { apiClient } from "@/src/lib/apiClient";
import {
    unwrapApiData,
    type ActiveLoansResponse,
    type ApiResponse,
    type PreLoansQuery,
    type PreLoansResponse,
    type WebLoanBorrower,
} from "./types";

/**
 * WebLoan integration API — mirrors Features/WebLoans/WebLoanEndpoints.cs.
 * Read-only fetch of borrower data from the WebLoan system database.
 * All endpoints require authentication (JWT bearer, attached by apiClient).
 */

/**
 * GET /api/webloans/cis/{cisNo} — full webloan borrower profile for a CIS number.
 * Returns 404 (ApiResponse error envelope) when no webloan records exist for the
 * given CIS number; that surfaces here as an axios error with response.status 404.
 */
export async function getWebLoanByCis(cisNo: string): Promise<WebLoanBorrower> {
    const res = await apiClient.get<ApiResponse<WebLoanBorrower>>(
        `/api/webloans/cis/${encodeURIComponent(cisNo)}`
    );
    return unwrapApiData(res.data);
}

/**
 * GET /api/webloans/cis/{cisNo}/accounts/{accountNo}/active-loans
 *
 * Returns up to 10 active PN rows for the given (CIS, account) pair, mirroring
 * the reference "Active Loans by existing borrower" SQL exactly. Throws an
 * axios error with response.status 404 if the account does not belong to the
 * given CIS (caller should treat that as an empty result / not-found).
 */
export async function getActiveLoansByAccount(
    cisNo: string,
    accountNo: string
): Promise<ActiveLoansResponse> {
    const res = await apiClient.get<ApiResponse<ActiveLoansResponse>>(
        `/api/webloans/cis/${encodeURIComponent(cisNo)}/accounts/${encodeURIComponent(accountNo)}/active-loans`
    );
    return unwrapApiData(res.data);
}

/**
 * GET /api/preloans?cisNo=...&accountNo=...
 *
 * Returns the list of in-progress (preloan) applications for the acting
 * officer. The server enforces a **bch = JWT-user.branchId** filter — i.e.
 * an officer in branch `000` only ever sees preloans from branch `000`,
 * even if the borrower's CIS spans multiple branches.
 *
 * The frontend passes through the `cisNo` / `accountNo` it already has from
 * the lookup; no bch is ever sent from the client (the server reads it from
 * the JWT).
 *
 * 404 ⇒ no preloans for the (cis, account) pair (the caller treats this as
 * "no rows" — it is NOT an error).
 */
export async function getPreLoans(
    query: PreLoansQuery
): Promise<PreLoansResponse> {
    const res = await apiClient.get<ApiResponse<PreLoansResponse>>(
        "/api/preloans",
        { params: query }
    );
    return unwrapApiData(res.data);
}
