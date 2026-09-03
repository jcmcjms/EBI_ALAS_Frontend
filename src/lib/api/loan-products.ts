import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/lib/queryKeys";
import {
    unwrapApiData,
    type ApiResponse,
    type LoanProductResponse,
    type LoanProductsQuery,
    type LoanProductsResponse,
} from "./types";

/**
 * GET /api/loan-products — bank policy table for fees.
 *
 * Reference data, but **not** as static as branches: Compliance changes
 * rates whenever the BSP updates documentary-stamp tax tables or the
 * bank signs a new insurance carrier. We give it a 5-minute `staleTime`
 * (vs the 1-hour branches cache) so a refreshed tab picks up rate
 * changes within the same session without thrashing the API on every
 * keystroke.
 *
 * When the backend endpoint isn't registered yet, we fall back to a
 * static dev seed so the wizard renders end-to-end (the FE mirror of
 * the C# `LoanProductRepository.GetActiveAsync` returns the same
 * shape). The seed is replaced automatically once the endpoint ships.
 */
const LOAN_PRODUCTS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// ── Dev seed ──────────────────────────────────────────────────────────────
// Mirrors the four canonical products the bank's fee rules table covers.
// Numbers are illustrative — Compliance will overwrite via the admin UI
// once the `/api/loan-products` endpoint is live.
const DEV_SEED: LoanProductResponse[] = [
    {
        id: 1,
        code: "PL",
        description: "PL - Payroll Loan",
        isActive: true,
        fees: [
            { feeCode: "NOTARIAL_FEE", feeType: "FLAT", defaultValue: 500, rate: 0, maxAllowedDeviation: 100 },
            { feeCode: "DOC_STAMPS", feeType: "PERCENTAGE", defaultValue: 0, rate: 0.5, maxAllowedDeviation: 50 },
            { feeCode: "INSURANCE", feeType: "PERCENTAGE", defaultValue: 0, rate: 0.25, maxAllowedDeviation: 50 },
        ],
    },
    {
        id: 2,
        code: "MPL",
        description: "MPL - Multi-Purpose Loan",
        isActive: true,
        fees: [
            { feeCode: "NOTARIAL_FEE", feeType: "FLAT", defaultValue: 750, rate: 0, maxAllowedDeviation: 100 },
            { feeCode: "DOC_STAMPS", feeType: "PERCENTAGE", defaultValue: 0, rate: 0.75, maxAllowedDeviation: 75 },
            { feeCode: "INSURANCE", feeType: "PERCENTAGE", defaultValue: 0, rate: 0.3, maxAllowedDeviation: 50 },
        ],
    },
    {
        id: 3,
        code: "C35",
        description: "C35 - Quick Loan",
        isActive: true,
        fees: [
            { feeCode: "NOTARIAL_FEE", feeType: "FLAT", defaultValue: 350, rate: 0, maxAllowedDeviation: 100 },
            { feeCode: "DOC_STAMPS", feeType: "FLAT", defaultValue: 200, rate: 0, maxAllowedDeviation: 50 },
            { feeCode: "INSURANCE", feeType: "FLAT", defaultValue: 150, rate: 0, maxAllowedDeviation: 50 },
        ],
    },
    {
        id: 4,
        code: "C23",
        description: "C23 - Easy Loan",
        isActive: true,
        fees: [
            { feeCode: "NOTARIAL_FEE", feeType: "FLAT", defaultValue: 500, rate: 0, maxAllowedDeviation: 100 },
            { feeCode: "DOC_STAMPS", feeType: "PERCENTAGE", defaultValue: 0, rate: 0.5, maxAllowedDeviation: 50 },
            { feeCode: "INSURANCE", feeType: "PERCENTAGE", defaultValue: 0, rate: 0.25, maxAllowedDeviation: 50 },
        ],
    },
];

/**
 * Fetch all active loan products.
 *
 * Resolves to a flat array (NOT a paged result) — the AO's product
 * dropdown is a single short list (typically <20 rows), and we want to
 * feed `findFeeRule` synchronously from the cache. Pagination on this
 * list would add an endpoint roundtrip with no UX win.
 *
 * Dev fallback: when the endpoint returns 404 (the route hasn't shipped
 * yet) we resolve with the static seed so the wizard renders. The seed
 * matches `LoanProductResponse` shape exactly, so the rest of the form
 * doesn't know the difference.
 */
export function useLoanProducts(params: LoanProductsQuery = {}) {
    return useQuery({
        queryKey: queryKeys.loanProducts.list(params),
        queryFn: async (): Promise<LoanProductResponse[]> => {
            try {
                const res = await apiClient.get<ApiResponse<LoanProductsResponse>>(
                    "/api/loan-products",
                    {
                        params: {
                            isActive: params.isActive ?? true,
                            code: params.code ?? undefined,
                        },
                    }
                );
                return unwrapApiData(res.data).items;
            } catch (err) {
                // Endpoint not registered yet — fall back to the dev seed
                // so the wizard renders during the rollout.
                if (
                    err &&
                    typeof err === "object" &&
                    "response" in err &&
                    (err as { response?: { status?: number } }).response?.status === 404
                ) {
                    const onlyActive = params.isActive ?? true;
                    return onlyActive ? DEV_SEED.filter((p) => p.isActive) : DEV_SEED;
                }
                throw err;
            }
        },
        staleTime: LOAN_PRODUCTS_STALE_TIME,
    });
}

/** Convenience: find a product by its bare code (e.g. "PL"). */
export function findProductByCode(
    products: LoanProductResponse[] | undefined,
    code: string
): LoanProductResponse | undefined {
    if (!products || !code) return undefined;
    return products.find((p) => p.code === code);
}
