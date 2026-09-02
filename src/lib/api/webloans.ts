import { apiClient } from "@/src/lib/apiClient";
import {
    unwrapApiData,
    type ActiveLoansResponse,
    type ApiResponse,
    type OutstandingLoansResponse,
    type PendingLoanResponse,
    type PreLoansQuery,
    type PreLoansResponse,
    type WebLoanCisSearchResponse,
} from "./types";

/**
 * WebLoan integration API — mirrors Features/WebLoans/WebLoanEndpoints.cs.
 * Read-only fetch of borrower data from the WebLoan system database.
 * All endpoints require authentication (JWT bearer, attached by apiClient).
 */

/**
 * GET /api/webloans/cis/{cisNo}/search — full webloan borrower profile for a CIS number.
 *
 * Returns `{ borrower, accounts[] }` (see `WebLoanCisSearchResponse`):
 *  - `borrower` — `cis_info` + resolved `agencyType` / `misAgency` /
 *    `requestingOfficer` / `lengthOfService` enrichments.
 *  - `accounts` — flat list of `loan_acct_info` rows for the CIS, fed
 *    straight into the LAI picker.
 *
 * Returns 404 (ApiResponse error envelope) when no `cis_info` row exists for
 * the given CIS number; that surfaces here as an axios error with
 * response.status 404.
 *
 * NOTE: a bare `/api/webloans/cis/{cisNo}` route used to be documented as a
 * "backward compatible full profile" endpoint but it is **not** registered
 * in `WebLoanEndpoints.cs` — only `/search`, `/outstanding-loans`, and
 * `/pending-loan` exist. We always call `/search` explicitly to avoid the
 * silent 404.
 */
export async function getWebLoanByCis(
    cisNo: string
): Promise<WebLoanCisSearchResponse> {
    const res = await apiClient.get<ApiResponse<WebLoanCisSearchResponse>>(
        `/api/webloans/cis/${encodeURIComponent(cisNo)}/search`
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
 * GET /api/webloans/cis/{cisNo}/accounts/{accountNo}/outstanding-loans
 *
 * Returns ALL active `loan_data` rows for the (bch, accountNo) pair where
 * `is_loan(loan_no) = 1 AND loan_status != 10`. The bch filter is enforced
 * server-side from the JWT `branchId` claim — the frontend never sends it.
 * Admin role bypasses the branch filter and `branchCode` echoes `"ALL"`.
 *
 * The (cisNo, accountNo) pair is validated by an anti-enumeration guard
 * that runs BEFORE any loan row is read (mirrors `/active-loans` and
 * `/pending-loan`): a 404 means the pair doesn't belong together, not
 * "no rows". A 200 with `loans: []` is a valid empty list.
 *
 * **Field mapping note — `principalBalance` IS the OUTSTANDING BALANCE.**
 * The backend's `principalBalance` mirrors `loan_data.principal_bal`
 * (the current principal balance, not the original). The frontend uses
 * this value to populate the "Outstanding Balance" column of the
 * obligations table; the original principal populates the "Principal
 * Balance" column so the AO sees both side by side.
 */
export async function getOutstandingLoans(
    cisNo: string,
    accountNo: string
): Promise<OutstandingLoansResponse> {
    const res = await apiClient.get<ApiResponse<OutstandingLoansResponse>>(
        `/api/webloans/cis/${encodeURIComponent(cisNo)}/accounts/${encodeURIComponent(accountNo)}/outstanding-loans`
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

/**
 * GET /api/webloans/cis/{cisNo}/accounts/{accountNo}/pending-loan
 *
 * Returns ALL in-flight pre_loan_data rows for the given (bch, accountNo)
 * pair, enriched with the corresponding loan_data fields (principal,
 * granted rate, product, purpose). The bch filter is **server-side** —
 * derived from the JWT `branchId` claim — the frontend never sends it.
 *
 * Multiple in-flight loans are possible for the same (bch, accountNo);
 * the caller picks the loan number (loan_no) the AO wants to use.
 *
 * Returns a 200 with `loans: []` when the (cis, account) pair is valid
 * but has no in-flight rows. The 404 case (account↔CIS pair unknown) is
 * treated here as a real error — the caller decides how to surface it.
 *
 * **Field mapping note — `principal` is the OUTSTANDING BALANCE.**
 * `principal` in this response mirrors `loan_data.principal` on the
 * backend, which for an active loan is the current `principal_bal`. The
 * frontend uses this value to populate the "Outstanding Balance" column
 * of the Obligations table on the new-loan form.
 */
export async function getPendingLoan(
    cisNo: string,
    accountNo: string
): Promise<PendingLoanResponse> {
    const res = await apiClient.get<ApiResponse<PendingLoanResponse>>(
        `/api/webloans/cis/${encodeURIComponent(cisNo)}/accounts/${encodeURIComponent(accountNo)}/pending-loan`
    );
    return unwrapApiData(res.data);
}
