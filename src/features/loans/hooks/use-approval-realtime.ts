import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEscalationStore } from "@/src/store/escalationStore";

/**
 * Subscribes to SignalR events from the NotificationHub for real-time
 * approval queue updates.
 *
 * Must be used inside a component that has access to the SignalR connection
 * (typically AppShell). Uses the shared connection from useSignalR.
 *
 * Events handled:
 * - `LoanAssigned`: A loan was assigned/released — invalidate queues.
 *   Payload includes `{ loanId, escalated: boolean }` for tier escalation.
 *
 * Presence is now handled by the Zustand presence store via
 * `usePresenceSync()` — no need to invalidate presence queries here.
 */
export function useApprovalRealtime(getConnection: () => import("@microsoft/signalr").HubConnection | null) {
    const qc = useQueryClient();
    const markEscalated = useEscalationStore((s) => s.markEscalated);

    useEffect(() => {
        const conn = getConnection();
        if (!conn) return;

        const onAssigned = (payload: { loanId?: number; escalated?: boolean } | undefined) => {
            // Track escalated loans so the approval page can show a badge.
            if (payload?.escalated && payload.loanId) {
                markEscalated(payload.loanId);
            }
            // Invalidate all loan queries (queues, detail, monitoring)
            qc.invalidateQueries({ queryKey: ["loans"] });
        };

        conn.on("LoanAssigned", onAssigned);

        return () => {
            conn.off("LoanAssigned", onAssigned);
        };
    }, [getConnection, qc, markEscalated]);
}
