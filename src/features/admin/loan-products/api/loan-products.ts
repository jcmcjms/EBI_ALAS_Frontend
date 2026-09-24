/**
 * Loan Products API — types and fetchers co-located.
 *
 * Mirrors Features/Loans/LoanProductEndpoints.cs.
 */

import { apiClient } from "@/src/lib/apiClient";
import {
    unwrapApiData,
    type ApiResponse,
    type LoanProductImportResult,
    type LoanProductResponse,
    type LoanProductSyncResult,
    type UpdateLoanProductPayload,
} from "@/src/lib/api/types";

export type { LoanProductImportResult } from "@/src/lib/api/types";

// ─── API Functions ──────────────────────────────────────────────────────────

/** GET /api/loan-products — every row, active + retired. */
export async function getLoanProducts(): Promise<LoanProductResponse[]> {
    const res = await apiClient.get<ApiResponse<LoanProductResponse[]>>(
        "/api/loan-products",
    );
    return unwrapApiData(res.data);
}

/** GET /api/loan-products/{code} — 404 when the code is not in the mirror. */
export async function getLoanProductByCode(
    code: string,
): Promise<LoanProductResponse | null> {
    const res = await apiClient.get<ApiResponse<LoanProductResponse>>(
        `/api/loan-products/${encodeURIComponent(code)}`,
    );
    return unwrapApiData(res.data);
}

/**
 * PUT /api/loan-products/{code} — admin write of policy fields.
 * Code, Description, IsRetired, and LastSyncedAt are preserved.
 */
export async function updateLoanProduct(
    code: string,
    payload: UpdateLoanProductPayload,
): Promise<LoanProductResponse> {
    const res = await apiClient.put<ApiResponse<LoanProductResponse>>(
        `/api/loan-products/${encodeURIComponent(code)}`,
        payload,
    );
    return unwrapApiData(res.data);
}

/** POST /api/loan-products/sync — manual sync trigger. Admin-only. */
export async function syncLoanProducts(): Promise<LoanProductSyncResult> {
    const res = await apiClient.post<ApiResponse<LoanProductSyncResult>>(
        "/api/loan-products/sync",
    );
    return unwrapApiData(res.data);
}

/** GET /api/loan-products/export — download the full product catalog as .xlsx. */
export async function exportLoanProducts(
    includeRetired = true,
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

/** GET /api/loan-products/import/template — download a blank .xlsx template. */
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

/** POST /api/loan-products/import — upsert loan products from an .xlsx file. */
export async function importLoanProducts(
    file: File,
): Promise<LoanProductImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiClient.post<ApiResponse<LoanProductImportResult>>(
        "/api/loan-products/import",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
    );

    return unwrapApiData(res.data);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convenience: find a product by its bare code (e.g. "PL", "C35").
 * Pure function so callers can run it against the cached `useLoanProducts`
 * data without an extra round-trip.
 */
export function findProductByCode(
    products: LoanProductResponse[] | undefined,
    code: string,
): LoanProductResponse | undefined {
    if (!products || !code) return undefined;
    return products.find((p) => p.code === code);
}
