import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/shared/lib/query/queryKeys";


export function useDashboardRealtime(
    getConnection: () => import("@microsoft/signalr").HubConnection | null,
) {
    const qc = useQueryClient();

    useEffect(() => {
        const conn = getConnection();
        if (!conn) return;

        const onDashboardUpdated = () => {
            
            
            
            qc.invalidateQueries({ queryKey: queryKeys.dashboard.full });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
        };

        conn.on("DashboardUpdated", onDashboardUpdated);

        return () => {
            conn.off("DashboardUpdated", onDashboardUpdated);
        };
    }, [getConnection, qc]);
}
