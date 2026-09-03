/**
 * LoanTransfersProvider
 * ---------------------
 * Single-instance mount point for `useLoanTransfers`.
 *
 * Why this exists
 * ---------------
 * react-hook-form supports exactly ONE mounted `useFieldArray` instance
 * per array name; a second instance with the same name keeps a private
 * fields snapshot and never observes the first one's append / remove /
 * swap. Mounting `useLoanTransfers` once here and sharing it via
 * context gives Section 4 (`obligations-section`) and Section 5
 * (`other-obligations`) the same `fields` snapshots and the same
 * mutation helpers, so a transfer between Outstanding Loans and EBI
 * Reloans is reflected in both tables on the same render.
 *
 * Prior to this provider, both section components called
 * `useLoanTransfers()` directly, which mounted two independent
 * `useFieldArray` instances for `outstandingLoans` and `ebiReloans`.
 * A transfer fired from one section mutated that instance's private
 * snapshot — the other section's instance continued to render its own
 * stale `fields`, producing the symptom of "toast success + source row
 * gone + empty target".
 *
 * Wiring
 * ------
 * `<LoanTransfersProvider>` MUST be mounted inside `<FormProvider>`
 * (i.e. after `methods` has been provided), because `useLoanTransfers`
 * reads the form via `useFormContext`. The provider itself adds no
 * markup — it is purely a hook-broadcast boundary.
 */
import { createContext, useContext, type ReactNode } from "react";

import { useLoanTransfers } from "./hooks/useLoanTransfers";

type LoanTransfersContextValue = ReturnType<typeof useLoanTransfers>;

const LoanTransfersContext = createContext<LoanTransfersContextValue | null>(null);

export function LoanTransfersProvider({ children }: { children: ReactNode }) {
    const value = useLoanTransfers();
    return (
        <LoanTransfersContext.Provider value={value}>
            {children}
        </LoanTransfersContext.Provider>
    );
}

// Canonical React context pattern: provider component + consumer hook
// are co-located so consumers have a single import surface
// (`useLoanTransfersContext`). Splitting into two files would force a
// re-export barrel and gain nothing at runtime; Fast Refresh still
// re-mounts cleanly because the file's only component
// (`LoanTransfersProvider`) re-renders on its own changes.
// eslint-disable-next-line react-refresh/only-export-components
export function useLoanTransfersContext(): LoanTransfersContextValue {
    const ctx = useContext(LoanTransfersContext);
    if (!ctx) {
        throw new Error(
            "useLoanTransfersContext must be used within <LoanTransfersProvider> " +
                "(mount it inside <FormProvider> in loan-creation.tsx).",
        );
    }
    return ctx;
}