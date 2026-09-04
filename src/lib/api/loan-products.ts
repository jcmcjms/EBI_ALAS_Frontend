import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/lib/queryKeys";
import {
    unwrapApiData,
    type ApiResponse,
    type LoanProductResponse,
    type LoanProductSyncResult,
    type LoanProductsQuery,
    type UpdateLoanProductPayload,
} from "./types";

/**
 * Loan-product HTTP client + React Query hooks.
 *
 * Mirrors the actual backend (`Features/Loans/LoanProductEndpoints.cs`).
 * The four routes we wrap here:
 *
 *   GET  /api/loan-products        → every row in the mirror (active + retired).
 *                                    Used by the admin catalog page.
 *   GET  /api/loan-products/active → non-retired rows only. Used by the
 *                                    AO loan-creation form's product
 *                                    dropdown.
 *   GET  /api/loan-products/{code} → single product by code (404 when
 *                                    the code hasn't been synced yet).
 *   PUT  /api/loan-products/{code} → admin write of policy fields
 *                                    (8-field `UpdateLoanProductPayload`).
 *                                    Sync-owned fields (Code, Description,
 *                                    IsRetired, LastSyncedAt) are preserved
 *                                    on this path.
 *   POST /api/loan-products/sync   → manual sync trigger. Returns the
 *                                    `LoanProductSyncResult` summary so
 *                                    ops can confirm what the run did.
 *
 * ## What this file does NOT do
 *
 *  - **No DELETE.** `MapLoanProductEndpoints` has no `MapDelete` —
 *    products cannot be removed through the admin API. Existence and
 *    retirement are owned by the webloan sync, not by ops.
 *  - **No CREATE.** Same reason — products are *mirrored* from webloan,
 *    not authored in ALAS. A missing row means "sync hasn't run yet";
 *    the fix is `POST /sync`, not a POST.
 *  - **No `isActive` toggle.** The frontend cannot change IsRetired —
 *    the sync owns it. The admin UI surfaces it as a read-only chip
 *    so ops can spot stale/retired rows.
 *  - **No `fees[]` array.** The product's three bank fees are three
 *    flat decimal columns on `LoanProduct` (`NotarialFee`,
 *    `DocStampFee`, `InsuranceFee`). The previous FE shape — with
 *    FLAT/PERCENTAGE rules, defaultValue, rate, and a per-fee
 *    maxAllowedDeviation — was an FE-only model that never matched
 *    the deployed backend.
 *
 * Reference: `Features/Loans/LoanProductEndpoints.cs` (route map),
 * `ILoanProductService.cs` (DTO shapes).
 */

// ── Imperative functions (used by the hooks below; also importable directly
//    from tests and server-side scripts if we ever add any). ───────────────

/** GET /api/loan-products — every row, active + retired. */
export async function getLoanProducts(): Promise<LoanProductResponse[]> {
    const res = await apiClient.get<ApiResponse<LoanProductResponse[]>>(
        "/api/loan-products"
    );
    return unwrapApiData(res.data);
}

/** GET /api/loan-products/active — non-retired rows only. */
export async function getActiveLoanProducts(): Promise<LoanProductResponse[]> {
    const res = await apiClient.get<ApiResponse<LoanProductResponse[]>>(
        "/api/loan-products/active"
    );
    return unwrapApiData(res.data);
}

/** GET /api/loan-products/{code} — 404 when the code is not in the mirror. */
export async function getLoanProductByCode(
    code: string
): Promise<LoanProductResponse | null> {
    const res = await apiClient.get<ApiResponse<LoanProductResponse>>(
        `/api/loan-products/${encodeURIComponent(code)}`
    );
    return unwrapApiData(res.data);
}

/**
 * PUT /api/loan-products/{code} — admin write of policy fields.
 *
 * The body is the 8-field `UpdateLoanProductPayload` shape; the backend
 * validates with `UpdateLoanProductValidator` (FluentValidation) and
 * re-runs defense-in-depth checks in `LoanProductService.ValidatePolicyFields`.
 * Code, Description, IsRetired, and LastSyncedAt are preserved.
 *
 * Throws (via `unwrapApiData`) when the backend returns `success: false`
 * — e.g. validation failure (HTTP 400 with `errors: [...]`) or 404
 * ("Loan product 'C99' not found. Run a sync first.").
 */
export async function updateLoanProduct(
    code: string,
    payload: UpdateLoanProductPayload
): Promise<LoanProductResponse> {
    const res = await apiClient.put<ApiResponse<LoanProductResponse>>(
        `/api/loan-products/${encodeURIComponent(code)}`,
        payload
    );
    return unwrapApiData(res.data);
}

/**
 * POST /api/loan-products/sync — manual sync trigger. Admin-only.
 *
 * Returns the run summary so the UI can show "Synced 7 products:
 * 1 added, 1 retired, 5 preserved" without grepping logs. The endpoint
 * is the same one the `LoanProductSyncHostedService` background job
 * hits on its interval; calling it manually is the way to force a
 * refresh after a webloan-side change.
 */
export async function syncLoanProducts(): Promise<LoanProductSyncResult> {
    const res = await apiClient.post<ApiResponse<LoanProductSyncResult>>(
        "/api/loan-products/sync"
    );
    return unwrapApiData(res.data);
}

// ── React Query hooks ─────────────────────────────────────────────────────

const LOAN_PRODUCTS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch the loan-product catalog.
 *
 * Defaults to the **active-only** endpoint so the AO loan-creation
 * form (the heaviest consumer of this hook) never picks a retired
 * product. Pass `{ includeRetired: true }` for the admin catalog
 * page, which needs to show retired rows for historical context.
 *
 * `staleTime` is 5 minutes: the catalog is bank policy and changes
 * infrequently (Compliance re-rates when BSP updates doc-stamps tax
 * tables), so a refreshed tab picks up changes within the same
 * session without thrashing the API on every keystroke.
 */
export function useLoanProducts(params: LoanProductsQuery = {}) {
    const includeRetired = params.isActive === false;
    return useQuery({
        queryKey: queryKeys.loanProducts.list(params),
        queryFn: () =>
            includeRetired ? getLoanProducts() : getActiveLoanProducts(),
        staleTime: LOAN_PRODUCTS_STALE_TIME,
    });
}

/**
 * Convenience: find a product by its bare code (e.g. "PL", "C35").
 * Pure function so callers can run it against the cached `useLoanProducts`
 * data without an extra round-trip.
 */
export function findProductByCode(
    products: LoanProductResponse[] | undefined,
    code: string
): LoanProductResponse | undefined {
    if (!products || !code) return undefined;
    return products.find((p) => p.code === code);
}
