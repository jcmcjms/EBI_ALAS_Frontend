/**
 * LoanTransfersProvider
 * ---------------------
 * Single-instance mount point for `useLoanTransfers`, scoped to the
 * active loan via `useActiveLoan`.
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
 * The provider keys its internal `TransfersBridge` by `activeLoanNo`
 * so that `useFieldArray` instances are remounted when the AO switches
 * tabs — RHF allows one `useFieldArray` per name, and keying
 * guarantees a single live instance per name at any time.
 */
import { createContext, useContext, type ReactNode } from "react";

import { useActiveLoan } from "./active-loan-context";
import { useLoanTransfers } from "./hooks/useLoanTransfers";

type LoanTransfersContextValue = ReturnType<typeof useLoanTransfers>;

const LoanTransfersContext = createContext<LoanTransfersContextValue | null>(null);

export function LoanTransfersProvider({ children }: { children: ReactNode }) {
    const { activeLoanNo, activeIndex, loans } = useActiveLoan();
    const scopeKey = loans.length > 0 ? activeLoanNo : "__no-loan__";
    return (
        <TransfersBridge key={scopeKey} loanIndex={loans.length > 0 ? activeIndex : null}>
            {children}
        </TransfersBridge>
    );
}

function TransfersBridge({ loanIndex, children }: { loanIndex: number | null; children: ReactNode }) {
    const value = useLoanTransfers(loanIndex);
    return <LoanTransfersContext.Provider value={value}>{children}</LoanTransfersContext.Provider>;
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
