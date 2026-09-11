import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { getCatLoanClass } from "@/src/lib/api/webloans";
import { queryKeys } from "@/src/lib/queryKeys";

/**
 * Resolves `loan_data.cat_loan_class` for the selected preloan via
 * GET /api/webloans/loan-class (the (bch, loan_no, loan_product) composite
 * key written by 1.3 "Account & preloan" on loan pick).
 *
 * Disabled until all three segments are present — the endpoint 400s on
 * missing params, so an incomplete key must never leave the client.
 */
export function useCatLoanClass(
    bch: string,
    loanNo: string,
    loanProduct: string
) {
    const branchCode = bch.trim();
    const loanNoTrimmed = loanNo.trim();
    const productCode = loanProduct.trim();
    const enabled = Boolean(branchCode && loanNoTrimmed && productCode);

    return useQuery({
        queryKey: enabled
            ? queryKeys.webLoans.loanClass(branchCode, loanNoTrimmed, productCode)
            : ["webloans", "loan-class", "disabled"],
        queryFn: () => getCatLoanClass(branchCode, loanNoTrimmed, productCode),
        enabled,
        // cat_loan_class is immutable for a prepared preloan and is now also
        // cached 12h server-side; five minutes was re-paying the legacy
        // round-trip several times per working session.
        staleTime: 60 * 60_000,
        gcTime: 24 * 60 * 60_000,
        // 400 (missing param) and 404 (no row for the triple) are
        // deterministic — retrying only delays the fallback display.
        retry: (failureCount, error) => {
            const status = (error as AxiosError)?.response?.status;
            if (status === 400 || status === 404) return false;
            return failureCount < 2;
        },
    });
}
