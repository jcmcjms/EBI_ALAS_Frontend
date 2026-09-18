import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/lib/queryKeys";
import {
    unwrapApiData,
    type ApiResponse,
    type LoanProductImportResult,
    type LoanProductResponse,
    type LoanProductSyncResult,
    type LoanProductsQuery,
    type UpdateLoanProductPayload,
} from "./types";

export type { LoanProductImportResult } from "./types";

/**
 * Loan-product HTTP client + React Query hooks.
 *
 * Mirrors the actual backend (`Features/Loans/LoanProductEndpoints.cs`).
 * The four routes we wrap here:
 *
 *   GET  /api/loan-products        → every row in the mirror (active + retired).
 *                                    Used by the admin catalog page.
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

/**
 * GET /api/loan-products/export — download the full product catalog as .xlsx.
 *
 * Returns a blob download; the browser triggers a file save dialog.
 * `includeRetired` defaults to `true` so ops get the full history.
 */
export async function exportLoanProducts(
    includeRetired = true
): Promise<void> {
    const res = await apiClient.get("/api/loan-products/export", {
        params: { includeRetired },
        responseType: "blob",
    });

    const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `loan-products-${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * GET /api/loan-products/import/template — download a blank .xlsx template
 * with headers, example rows, and an instructions sheet.
 */
export async function downloadLoanProductTemplate(): Promise<void> {
    const res = await apiClient.get("/api/loan-products/import/template", {
        responseType: "blob",
    });

    const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "loan-product-import-template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * POST /api/loan-products/import — upsert loan products from an .xlsx file.
 *
 * Existing codes are updated (policy fields + Description + IsRetired);
 * new codes are created. Returns per-row validation errors so ops can
 * fix the spreadsheet and re-upload.
 */
export async function importLoanProducts(
    file: File
): Promise<LoanProductImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiClient.post<ApiResponse<LoanProductImportResult>>(
        "/api/loan-products/import",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );

    return unwrapApiData(res.data);
}

// ── React Query hooks ─────────────────────────────────────────────────────

const LOAN_PRODUCTS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch the loan-product catalog (admin view — active + retired).
 *
 * Single source of truth: `GET /api/loan-products` returns every row
 * in the mirror. The admin catalog page filters client-side via the
 * "Include retired" toggle; the creation tree no longer fetches the
 * catalog at all (it uses the pending-loan feed and `/loan-class`).
 *
 * `staleTime` is 5 minutes: the catalog is bank policy and changes
 * infrequently (Compliance re-rates when BSP updates doc-stamps tax
 * tables), so a refreshed tab picks up changes within the same
 * session without thrashing the API on every keystroke.
 */
export function useLoanProducts(params: LoanProductsQuery = {}) {
    return useQuery({
        queryKey: queryKeys.loanProducts.list(params),
        queryFn: getLoanProducts,
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
