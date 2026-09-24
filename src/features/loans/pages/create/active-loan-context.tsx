import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { SelectedLoan } from "./schema";

interface ActiveLoanContextValue {
    loans: SelectedLoan[];
    activeLoanNo: string;
    activeIndex: number;
    setActiveLoanNo: (loanNo: string) => void;
}

const ActiveLoanContext = createContext<ActiveLoanContextValue | null>(null);

/**
 * Single source of truth for "which selected loan am I looking at".
 * Deselect-safe: falls back to the first loan during render (no setState-in-effect).
 */
export function ActiveLoanProvider({ loans, children }: { loans: SelectedLoan[]; children: ReactNode }) {
    const [activeLoanNo, setActiveLoanNo] = useState("");

    const value = useMemo<ActiveLoanContextValue>(() => {
        const effective =
            activeLoanNo && loans.some((l) => l?.loanNo === activeLoanNo)
                ? activeLoanNo
                : (loans[0]?.loanNo ?? "");
        return {
            loans,
            activeLoanNo: effective,
            activeIndex: Math.max(0, loans.findIndex((l) => l?.loanNo === effective)),
            setActiveLoanNo,
        };
    }, [loans, activeLoanNo]);

    return <ActiveLoanContext.Provider value={value}>{children}</ActiveLoanContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveLoan(): ActiveLoanContextValue {
    const ctx = useContext(ActiveLoanContext);
    if (!ctx) throw new Error("useActiveLoan must be used within <ActiveLoanProvider> (loan-creation.tsx).");
    return ctx;
}
