import { useQuery } from '@tanstack/react-query'
import { auditLogKeys } from '@/src/features/audit-logs/api/audit-queries'
import type { AuditLogQueryParams } from '../api/audit-log-types'
import { getAuditLog, listAuditLogs } from '../api/audit-logs'

export function useAuditLogs(params: AuditLogQueryParams) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => listAuditLogs(params),
    placeholderData: (prev) => prev,
  })
}

export function useAuditLog(id: number | null) {
  return useQuery({
    queryKey:
      id !== null
        ? auditLogKeys.detail(id)
        : ['auditLogs', 'detail', 'disabled'],
    queryFn: () => getAuditLog(id!),
    enabled: id !== null,
  })
}
