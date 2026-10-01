

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/src/shared/lib/query/queryKeys";
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



const LOAN_PRODUCTS_STALE_TIME = 5 * 60_000; 


export function useLoanProducts() {
    return useQuery({
        queryKey: queryKeys.loanProducts.list(),
        queryFn: getLoanProducts,
        staleTime: LOAN_PRODUCTS_STALE_TIME,
    });
}


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



function useInvalidateLoanProducts() {
    const queryClient = useQueryClient();
    return () =>
        queryClient.invalidateQueries({
            queryKey: queryKeys.loanProducts.all,
        });
}


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


export function useSyncLoanProducts() {
    const invalidate = useInvalidateLoanProducts();
    return useMutation({
        mutationFn: () => syncLoanProducts(),
        onSuccess: () => invalidate(),
    });
}


export function useImportLoanProducts() {
    const invalidate = useInvalidateLoanProducts();
    return useMutation<LoanProductImportResult, Error, File>({
        mutationFn: importLoanProducts,
        onSuccess: () => invalidate(),
    });
}
