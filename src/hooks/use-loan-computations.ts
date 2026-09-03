import { useMemo } from "react";
import { useWatch, useFormContext } from "react-hook-form";

import {
    buildLoanMetricsSnapshot,
    computeLoanMetrics,
    type BuyOutRowCarrier,
    type EbiRowCarrier,
    type IncomingRowCarrier,
    type LoanComputationResults,
    type LoanParamsCarrier,
    type NthpCarrier,
    type OutstandingLoanCarrier,
} from "@/src/lib/loan-computations";

/**
 * Reactive bridge between RHF's form state and the pure computation
 * engine in `@/src/lib/loan-computations`.
 *
 * Subscribes (via `useWatch`) only to the slices the math actually
 * reads — `loan`, `client`, and the three obligation arrays — so an
 * AO typing into `verification.findings` or `deviations.remarks` does
 * **not** retrigger the recalculation. This keeps the wizard at 60fps
 * even when the printed preview is rendered below the fold.
 *
 * ─── Why not `useWatch({ control })` at the root? ──────────────────────
 * The approval-form preview re-renders on every change to *anything*
 * in the form, which forces the PMT calculation to run on every
 * keystroke in `deviations.otherRemarks`, `address`, etc. The
 * scoped `useWatch` calls below narrow the subscription so the math
 * only re-runs when one of the eight inputs it depends on actually
 * mutates.
 *
 * ─── Backend is still the authority ───────────────────────────────────────
 * The numbers this hook returns are *projections* used for the
 * capacity-to-pay gate, the on-screen Approval Form preview, and the
 * PDF export. The backend (`.NET 8`) recomputes the same values with
 * `decimal` precision and is the authoritative source for the
 * persisted loan record (`OutstandingLoansResponse.amortAmount`,
 * `PendingLoanDto.amortization`, …). Never read these values back
 * from this hook and trust them for ledger entries.
 *
 * ─── Cross-file type boundary ────────────────────────────────────────────
 * The hook is parameter-less so it can be used inside any component
 * wrapped in `<FormProvider>`. The form's type is read off the
 * context at call time rather than imported at module scope, which
 * keeps the dependency on `@/pages/loans/create/schema` lazy and
 * avoids a circular import (the schema imports the engine for its
 * `superRefine` rules).
 */
export function useLoanComputations(): LoanComputationResults {
    // `useFormContext()` is intentionally not parameterised with the
    // schema type — doing so would re-introduce a circular import
    // (this hook is consumed inside the schema's `superRefine` via
    // `buildLoanMetricsSnapshot`). The `useWatch` calls below pass
    // path strings (`"loan"`, `"client"`, …) which don't require the
    // schema type to be in scope — the path strings are validated by
    // RHF at runtime, not by TypeScript.
    const { control } = useFormContext();

    // Narrow subscriptions to the slices the engine reads. Each call
    // returns the *current* value; the `useMemo` below is keyed on
    // these references so the calculation runs exactly once per
    // mutation of any of them.
    const loan = useWatch({ control, name: "loan" });
    const client = useWatch({ control, name: "client" });
    const outstandingLoans = useWatch({ control, name: "outstandingLoans" });
    const ebiReloans = useWatch({ control, name: "ebiReloans" });
    const buyOuts = useWatch({ control, name: "buyOuts" });
    const incomingLoans = useWatch({ control, name: "incomingLoans" });

    return useMemo(() => {
        const { loan: loanInputs, income } = buildLoanMetricsSnapshot({
            loan: (loan ?? {}) as LoanParamsCarrier,
            client: (client ?? {}) as NthpCarrier,
            outstandingLoans: outstandingLoans as readonly OutstandingLoanCarrier[] | undefined,
            ebiReloans: ebiReloans as readonly EbiRowCarrier[] | undefined,
            buyOuts: buyOuts as readonly BuyOutRowCarrier[] | undefined,
            incomingLoans: incomingLoans as readonly IncomingRowCarrier[] | undefined,
        });

        return computeLoanMetrics(loanInputs, income);
    }, [loan, client, outstandingLoans, ebiReloans, buyOuts, incomingLoans]);
}