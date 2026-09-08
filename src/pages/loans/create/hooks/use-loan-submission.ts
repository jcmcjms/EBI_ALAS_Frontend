import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

import { submitLoanApplication } from "@/src/lib/api/loans";
import type { LoanSubmissionPayload, LoanSubmissionResponse } from "@/src/lib/api/types";

/**
 * Submission mutation with an explicit Idempotency-Key lifecycle:
 *  - the key is minted once per logical submission and reused across every
 *    retry of that submission (double-click, axios 401-refresh replay,
 *    React Query retry), so the server dedupes instead of minting a second
 *    LAM series;
 *  - `rotateIdempotencyKey()` must be called when the logical operation ends
 *    (success or form reset) so the next application gets a fresh key.
 */
export function useLoanSubmission() {
    const queryClient = useQueryClient();
    const keyRef = useRef<string>(crypto.randomUUID());

    const mutation = useMutation<
        LoanSubmissionResponse,
        Error,
        LoanSubmissionPayload
    >({
        mutationFn: (payload) => submitLoanApplication(payload, keyRef.current),
        // Network-level retry is safe precisely because the key is stable.
        retry: 1,
        onSuccess: () => {
            // Both the loans list (admin) and the monitoring view depend on
            // this prefix; one invalidation refreshes both. We use the bare
            // string prefix to avoid the generic-parameter trap on
            // `queryKeys.loans.monitoring`.
            queryClient.invalidateQueries({ queryKey: ["loans"] });
        },
    });

    const rotateIdempotencyKey = useCallback(() => {
        keyRef.current = crypto.randomUUID();
    }, []);

    return { ...mutation, rotateIdempotencyKey };
}