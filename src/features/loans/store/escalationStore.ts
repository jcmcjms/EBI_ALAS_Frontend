import { create } from "zustand/react";

interface EscalationState {
    /** Loan IDs that have been escalated during this session. */
    escalatedLoanIds: Set<number>;
    /** Mark a loan as escalated. */
    markEscalated: (loanId: number) => void;
    /** Check if a loan has been escalated. */
    isEscalated: (loanId: number) => boolean;
    /** Clear a loan's escalation status (e.g. after the badge has been seen). */
    clearEscalated: (loanId: number) => void;
}

/**
 * Tracks which loans have been escalated to a higher-tier approver
 * during the current session. Populated by the SignalR `LoanAssigned`
 * event when `escalated === true`, consumed by the loan approval page
 * to show an "Escalated" badge.
 *
 * Purely in-memory — resets on page refresh (which is acceptable
 * because the badge is a session-level notification, not persisted).
 */
export const useEscalationStore = create<EscalationState>((set, get) => ({
    escalatedLoanIds: new Set(),

    markEscalated: (loanId) =>
        set((state) => {
            const next = new Set(state.escalatedLoanIds);
            next.add(loanId);
            return { escalatedLoanIds: next };
        }),

    isEscalated: (loanId) => get().escalatedLoanIds.has(loanId),

    clearEscalated: (loanId) =>
        set((state) => {
            const next = new Set(state.escalatedLoanIds);
            next.delete(loanId);
            return { escalatedLoanIds: next };
        }),
}));
