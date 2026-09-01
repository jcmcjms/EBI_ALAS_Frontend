import { apiClient } from "@/src/lib/apiClient";
import {
    unwrapApiData,
    type ApiResponse,
    type AuditLogQueryParams,
    type AuditLogRecord,
    type PagedResult,
} from "./types";

/**
 * Audit log API — mirrors Features/AuditLogs/AuditLogEndpoints.cs.
 * Requires `auditLogs.view` permission (granted to Admin role).
 */

/** GET /api/audit-logs — paged, filterable audit log list. */
export async function listAuditLogs(
    params: AuditLogQueryParams
): Promise<PagedResult<AuditLogRecord>> {
    const res = await apiClient.get<ApiResponse<PagedResult<AuditLogRecord>>>(
        "/api/audit-logs",
        {
            params: {
                page: params.page ?? 1,
                pageSize: params.pageSize ?? 20,
                search: params.search || undefined,
                action: params.action || undefined,
                entityType: params.entityType || undefined,
                startDate: params.startDate || undefined,
                endDate: params.endDate || undefined,
            },
        }
    );
    return unwrapApiData(res.data);
}

/** GET /api/audit-logs/{id} — single audit log record. */
export async function getAuditLog(id: number): Promise<AuditLogRecord> {
    const res = await apiClient.get<ApiResponse<AuditLogRecord>>(
        `/api/audit-logs/${id}`
    );
    return unwrapApiData(res.data);
}
