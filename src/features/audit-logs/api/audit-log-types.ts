/** Raw DTO returned by GET /api/audit-logs (no ApiResponse envelope). */
export interface BackendAuditLogDto {
  id: string
  timestamp: string
  userId: string | null
  userName: string
  action: string
  entityType: string
  entityId: string
  entityLabel: string
  summary: string
  rawChanges: string | null
  ipAddress: string | null
  userAgent: string | null
}

export interface AuditLogRecord {
  id: string
  timestamp: string
  userId: string | null
  userName: string
  action: 'Create' | 'Update' | 'StatusChange' | 'Login' | 'Logout' | 'Delete' | 'Import' | 'Sync'
  entityType: string
  entityId: string
  entityLabel: string
  summary: string
  rawChanges: string | null
  ipAddress: string | null
  userAgent: string | null
}

export interface AuditLogQueryParams {
  page?: number
  pageSize?: number
  search?: string
  action?: string
  entityType?: string
  startDate?: string
  endDate?: string
}

export function toAuditLogRecord(dto: BackendAuditLogDto): AuditLogRecord {
  return {
    id: dto.id,
    timestamp: dto.timestamp,
    userId: dto.userId,
    userName: dto.userName,
    action: (dto.action as AuditLogRecord['action']) || 'Update',
    entityType: dto.entityType,
    entityId: dto.entityId,
    entityLabel: dto.entityLabel,
    summary: dto.summary,
    rawChanges: dto.rawChanges,
    ipAddress: dto.ipAddress,
    userAgent: dto.userAgent,
  }
}
