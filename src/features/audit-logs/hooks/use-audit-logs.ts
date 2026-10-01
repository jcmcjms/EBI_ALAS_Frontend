

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/src/shared/lib/query/queryKeys";
import type { AuditLogQueryParams } from "@/src/lib/api/types";
import { getAuditLog, listAuditLogs } from "../api/audit-logs";


export function useAuditLogs(params: AuditLogQueryParams) {
    return useQuery({
        queryKey: queryKeys.auditLogs.list(params),
        queryFn: () => listAuditLogs(params),
        placeholderData: (prev) => prev,
    });
}


export function useAuditLog(id: number | null) {
    return useQuery({
        queryKey:
            id !== null
                ? queryKeys.auditLogs.detail(id)
                : ["auditLogs", "detail", "disabled"],
        queryFn: () => getAuditLog(id!),
        enabled: id !== null,
    });
}
