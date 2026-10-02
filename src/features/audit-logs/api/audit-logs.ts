import { apiClient } from '@/src/shared/lib/apiClient'
import {
  unwrapApiData,
  type ApiResponse,
  type AuditLogQueryParams,
  type AuditLogRecord,
  type PagedResult,
} from '@/src/shared/lib/api/types'

export type { AuditLogQueryParams, AuditLogRecord } from '@/src/shared/lib/api/types'

export async function listAuditLogs(
  params: AuditLogQueryParams,
): Promise<PagedResult<AuditLogRecord>> {
  const res = await apiClient.get<ApiResponse<PagedResult<AuditLogRecord>>>(
    '/api/audit-logs',
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
    },
  )
  return unwrapApiData(res.data)
}

export async function getAuditLog(id: number): Promise<AuditLogRecord> {
  const res = await apiClient.get<ApiResponse<AuditLogRecord>>(
    `/api/audit-logs/${id}`,
  )
  return unwrapApiData(res.data)
}
