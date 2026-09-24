/**
 * LoanTransfersProvider
 * ---------------------
 * Single-instance mount point for `useLoanTransfers`, scoped to the
 * active loan via `useActiveLoan`.
 *
 * MUST NOT be keyed by the active loan: keying remounts the provider's
 * children — the entire form subtree — which destroys local component
 * state (the CIS island's fetched pending-loan list, selected LAI, etc.)
 * on every loan selection / tab switch. The hook below mounts exactly
 * one useFieldArray (static name) and touches per-loan arrays only
 * through setValue, so nothing here needs to remount when the active
 * loan changes.
 */
import { createContext, useContext, type ReactNode } from "react";

import { useActiveLoan } from "./active-loan-context";
import { useLoanTransfers } from "@/src/features/loans/hooks/use-loan-transfers";

type LoanTransfersContextValue = ReturnType<typeof useLoanTransfers>;

const LoanTransfersContext = createContext<LoanTransfersContextValue | null>(null);

export function LoanTransfersProvider({ children }: { children: ReactNode }) {
    const { activeIndex, loans } = useActiveLoan();
    const value = useLoanTransfers(loans.length > 0 ? activeIndex : null);
    return (
        <LoanTransfersContext.Provider value={value}>
            {children}
        </LoanTransfersContext.Provider>
    );
}

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
