import { apiClient } from '@/src/shared/lib/apiClient'
import type { PagedResult } from '@/src/shared/lib/api/types'
import type {
  AuditLogQueryParams,
  AuditLogRecord,
  BackendAuditLogDto,
} from './audit-log-types'
import { toAuditLogRecord } from './audit-log-types'

export type { AuditLogQueryParams, AuditLogRecord } from './audit-log-types'

/** Raw DTO list page returned by GET /api/audit-logs (no ApiResponse envelope). */
export async function listAuditLogs(
  params: AuditLogQueryParams,
): Promise<PagedResult<AuditLogRecord>> {
  const res = await apiClient.get<PagedResult<BackendAuditLogDto>>(
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
  const page = res.data
  return {
    items: (page.items ?? []).map(toAuditLogRecord),
    currentPage: page.currentPage,
    pageSize: page.pageSize,
    totalCount: page.totalCount,
    totalPages: page.totalPages,
    hasPreviousPage: page.hasPreviousPage,
    hasNextPage: page.hasNextPage,
  }
}

export async function getAuditLog(id: string): Promise<AuditLogRecord> {
  const res = await apiClient.get<BackendAuditLogDto>(`/api/audit-logs/${id}`)
  return toAuditLogRecord(res.data)
}
