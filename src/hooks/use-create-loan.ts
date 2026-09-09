import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { loanApi } from "@/src/lib/api/loans";
import { queryKeys } from "@/src/lib/queryKeys";
import type { CreateLoanPayload, LoanSubmissionResponse } from "@/src/lib/api/types";

/**
 * Mutation hook for the loan application wizard's submit action.
 *
 * Owns three concerns in one place so the form stays declarative:
 *
 *   1. **Idempotency-Key lifecycle** — the backend's
 *      `IdempotencyMiddleware` *requires* a GUID per logical submission
 *      and dedupes retries against it. The key is minted once per hook
 *      instance and reused across every retry of the same logical
 *      submission (double-click, axios 401-refresh replay, React Query
 *      automatic retry). After success we rotate to a fresh key so the
 *      next application gets a clean dedupe window — never reuse the
 *      same key across two distinct submissions, that would silently
 *      replay the first response.
 *
 *   2. **Cache invalidation** — on success we invalidate
 *      `queryKeys.loans.all` so the monitoring dashboard, the admin
 *      list, and any other loan query all refetch on the next render.
 *      The invalidation is partial-match safe: invalidating `["loans"]`
 *      covers `["loans", "monitoring", ...]`, `["loans", "list", ...]`,
 *      and future leaves without listing each one. The redirected
 *      route (`/loans/monitoring`) then re-fetches automatically
 *      because its query key falls under that prefix.
 *
 *   3. **Routing** — on success we redirect to the monitoring page
 *      so the user sees their newly-submitted application at the top
 *      of the default sort (ApplicationDate DESC). Toast confirms
 *      submission; failures surface the server message verbatim.
 */
export function useCreateLoan() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // One stable key per logical submission. Survives React Query
    // retries because `useRef` keeps it across re-renders within the
    // same hook instance — the value is replaced only when
    // `rotateIdempotencyKey()` is called after success.
    const keyRef = useRef<string>(crypto.randomUUID());

    const mutation = useMutation<
        LoanSubmissionResponse,
        Error,
        CreateLoanPayload
    >({
        // POST /api/loans — see Features/Loans/Endpoints/POST on the
        // backend. The Idempotency-Key header is the dedupe token.
        mutationFn: (payload) => loanApi.createLoan(payload, keyRef.current),

        // Network-level retry is safe precisely because the key is
        // stable across retries — the server replays the stored
        // response for the same key rather than minting a second
        // application group. Single retry (not infinite) so a hard
        // 5xx surfaces to the user instead of looping.
        retry: 1,

        onSuccess: (response) => {
            // 1. Cache invalidation — the redirected monitoring page
            //    will re-fetch with the new loan at the top because
            //    invalidating `["loans"]` covers every concrete
            //    `["loans", "monitoring", ...]` key.
            queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });

            // 2. Toast — shows the application group number so the AO
            //    can quote it on the recommendation slip / call the
            //    recommender with a stable reference.
            toast.success(
                `Loan application ${response.applicationGroupNo} submitted successfully.`
            );

            // 3. Navigate — monitoring page sorts by ApplicationDate
            //    DESC by default, so the new loan lands at the top of
            //    the table.
            navigate("/loans/monitoring");
        },

        onError: (error) => {
            toast.error(`Failed to submit loan: ${error.message}`);
        },
    });

    /**
     * Mint a fresh idempotency key. MUST be called when the form is
     * reset for a new application ("Change client" / page reload) so
     * the next submission is not silently deduped against the
     * previous one.
     */
    const rotateIdempotencyKey = useCallback(() => {
        keyRef.current = crypto.randomUUID();
    }, []);

    return { ...mutation, rotateIdempotencyKey };
}
