/**
 * Loan Products feature hooks — TanStack Query wrappers.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/src/lib/queryKeys";
import type {
    LoanProductImportResult,
    LoanProductResponse,
    UpdateLoanProductPayload,
} from "@/src/lib/api/types";
import {
    getLoanProductByCode,
    getLoanProducts,
    importLoanProducts,
    syncLoanProducts,
    updateLoanProduct,
} from "../api/loan-products";

// ─── Queries ────────────────────────────────────────────────────────────────

const LOAN_PRODUCTS_STALE_TIME = 5 * 60_000; // 5 minutes

/**
 * Fetch the loan-product catalog (admin view — active + retired).
 * Single endpoint: `GET /api/loan-products`.
 */
export function useLoanProducts() {
    return useQuery({
        queryKey: queryKeys.loanProducts.list(),
        queryFn: getLoanProducts,
        staleTime: LOAN_PRODUCTS_STALE_TIME,
    });
}

/**
 * Single-product query (`GET /api/loan-products/{code}`).
 */
export function useLoanProduct(code: string | null) {
    return useQuery({
        queryKey:
            code !== null
                ? queryKeys.loanProducts.detail(code)
                : ["loan-products", "detail", "disabled"],
        queryFn: () => getLoanProductByCode(code!),
        enabled: code !== null,
        staleTime: LOAN_PRODUCTS_STALE_TIME,
    });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

function useInvalidateLoanProducts() {
    const queryClient = useQueryClient();
    return () =>
        queryClient.invalidateQueries({
            queryKey: queryKeys.loanProducts.all,
        });
}

/**
 * `PUT /api/loan-products/{code}` — admin write of policy fields.
 * Pessimistic: cache invalidated only after backend confirms success.
 */
export function useUpdateLoanProduct() {
    const queryClient = useQueryClient();
    const invalidate = useInvalidateLoanProducts();
    return useMutation({
        mutationFn: ({
            code,
            payload,
        }: {
            code: string;
            payload: UpdateLoanProductPayload;
        }) => updateLoanProduct(code, payload),
        onSuccess: (updated: LoanProductResponse) => {
            invalidate();
            queryClient.setQueryData(
                queryKeys.loanProducts.detail(updated.code),
                updated,
            );
        },
    });
}

/** `POST /api/loan-products/sync` — manual sync trigger. */
export function useSyncLoanProducts() {
    const invalidate = useInvalidateLoanProducts();
    return useMutation({
        mutationFn: () => syncLoanProducts(),
        onSuccess: () => invalidate(),
    });
}

/** `POST /api/loan-products/import` — upsert loan products from Excel. */
export function useImportLoanProducts() {
    const invalidate = useInvalidateLoanProducts();
    return useMutation<LoanProductImportResult, Error, File>({
        mutationFn: importLoanProducts,
        onSuccess: () => invalidate(),
    });
}
