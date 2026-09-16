import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { approvalMatrixKeys } from "@/src/lib/api/approval-matrix";

/**
 * Subscribes to SignalR events from the NotificationHub for real-time
 * approval queue and presence updates.
 *
 * Must be used inside a component that has access to the SignalR connection
 * (typically AppShell). Uses the shared connection from useSignalR.
 *
 * Events handled:
 * - `LoanAssigned`: A loan was assigned/released — invalidate queues + presence
 * - `PresenceChanged`: An approver came online/offline — invalidate presence
 */
export function useApprovalRealtime(getConnection: () => import("@microsoft/signalr").HubConnection | null) {
    const qc = useQueryClient();

    useEffect(() => {
        const conn = getConnection();
        if (!conn) return;

        const onAssigned = () => {
            // Invalidate all loan queries (queues, detail, monitoring)
            qc.invalidateQueries({ queryKey: ["loans"] });
            // Invalidate presence (reviewing state changed)
            qc.invalidateQueries({ queryKey: approvalMatrixKeys.presence() });
        };

        const onPresence = () => {
            // Invalidate presence snapshot
            qc.invalidateQueries({ queryKey: approvalMatrixKeys.presence() });
        };

        conn.on("LoanAssigned", onAssigned);
        conn.on("PresenceChanged", onPresence);

        return () => {
            conn.off("LoanAssigned", onAssigned);
            conn.off("PresenceChanged", onPresence);
        };
    }, [getConnection, qc]);
}
