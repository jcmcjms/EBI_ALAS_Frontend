import { useQuery } from "@tanstack/react-query";
import { getAuditLog, listAuditLogs } from "@/src/lib/api/audit-logs";
import { queryKeys } from "@/src/lib/queryKeys";
import type { AuditLogQueryParams } from "@/src/lib/api/types";

/** Paged + filtered audit log directory (server-side search/pagination). */
export function useAuditLogs(params: AuditLogQueryParams) {
    return useQuery({
        queryKey: queryKeys.auditLogs.list(params),
        queryFn: () => listAuditLogs(params),
        placeholderData: (prev) => prev,
    });
}

/** Single audit log record by ID. */
export function useAuditLog(id: number | null) {
    return useQuery({
        queryKey: id !== null ? queryKeys.auditLogs.detail(id) : ["auditLogs", "detail", "disabled"],
        queryFn: () => getAuditLog(id!),
        enabled: id !== null,
    });
}
