import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse, type WebLoanBorrower } from "./types";

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
