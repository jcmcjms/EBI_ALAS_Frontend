import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getLoanProductByCode,
    syncLoanProducts,
    updateLoanProduct,
} from "@/src/lib/api/loan-products";
import { queryKeys } from "@/src/lib/queryKeys";
import type {
    LoanProductResponse,
    UpdateLoanProductPayload,
} from "@/src/lib/api/types";

/**
 * Single-product query (`GET /api/loan-products/{code}`).
 *
 * `enabled: code !== null` so the admin edit sheet can pass `null`
 * while closed — the query is torn down cleanly instead of firing
 * with a fake code. The `disabled` sentinel in the queryKey prevents
 * a previous product's data from leaking into a freshly-opened
 * sheet for a different code.
 */
export function useLoanProduct(code: string | null) {
    return useQuery({
        queryKey:
            code !== null
                ? queryKeys.loanProducts.detail(code)
                : ["loan-products", "detail", "disabled"],
        queryFn: () => getLoanProductByCode(code!),
        enabled: code !== null,
    });
}

/**
 * Broadest invalidator for the loan-products cache.
 *
 * `queryKeys.loanProducts.all` is the prefix; partial-match in
 * TanStack Query means a single invalidate call refreshes both the
 * list and every `detail(code)` we have open. Cheaper than walking
 * the query cache by hand.
 */
function useInvalidateLoanProducts() {
    const queryClient = useQueryClient();
    return () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.loanProducts.all });
}

/**
 * `PUT /api/loan-products/{code}` — admin write of policy fields.
 *
 * Pessimistic: the cache is only invalidated after the backend
 * confirms success (`onSuccess`), not on an optimistic tick. In a
 * banking context we never want the UI to claim a fee change
 * happened before the API has 200'd — a second tab could already
 * be showing the old value to a different user.
 *
 * We also `setQueryData` for the `detail(code)` key so a follow-up
 * read of the same product (e.g. reopening the edit sheet) returns
 * the new row without an extra roundtrip.
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
                updated
            );
        },
    });
}

/**
 * `POST /api/loan-products/sync` — manual sync trigger.
 *
 * Returns the `LoanProductSyncResult` from the backend (added /
 * updated / preserved counts) so the UI can show "Synced 7
 * products: 1 added, 1 retired, 5 preserved" in a toast.
 *
 * The mutation invalidates the loan-products list on success — the
 * backend already wrote the rows, so we just need the table to
 * re-fetch.
 */
export function useSyncLoanProducts() {
    const invalidate = useInvalidateLoanProducts();
    return useMutation({
        mutationFn: () => syncLoanProducts(),
        onSuccess: () => {
            invalidate();
        },
    });
}
