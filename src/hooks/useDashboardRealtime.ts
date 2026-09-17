import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/lib/queryKeys";

/**
 * Subscribes to SignalR `DashboardUpdated` events and invalidates the
 * dashboard TanStack Query cache so the next render re-fetches fresh
 * data from the backend.
 *
 * This replaces the 30s polling on the dashboard page — when a loan
 * status changes (submission, approval, pushback, etc.), the server
 * pushes a lightweight `DashboardUpdated` event via SignalR. The
 * client invalidates its cache and re-fetches on the next render,
 * giving sub-second dashboard freshness without polling overhead.
 *
 * Must be used inside a component that has access to the SignalR
 * connection (typically AppShell). Uses the shared connection from
 * useSignalR.
 *
 * @param getConnection A function that returns the current
 *   HubConnection instance (or null if not yet connected). Passed
 *   from the parent component that owns the useSignalR hook.
 */
export function useDashboardRealtime(
    getConnection: () => import("@microsoft/signalr").HubConnection | null,
) {
    const qc = useQueryClient();

    useEffect(() => {
        const conn = getConnection();
        if (!conn) return;

        const onDashboardUpdated = () => {
            // Invalidate all dashboard queries — the overview endpoint
            // returns the full dashboard payload in one call, so a
            // single invalidation refreshes every widget.
            qc.invalidateQueries({ queryKey: queryKeys.dashboard.full });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
        };

        conn.on("DashboardUpdated", onDashboardUpdated);

        return () => {
            conn.off("DashboardUpdated", onDashboardUpdated);
        };
    }, [getConnection, qc]);
}
