export interface AuditLogRecord {
  id: number
  timestamp: string
  userId: number | null
  userName: string
  action: 'Create' | 'Update' | 'StatusChange' | 'Login' | 'Logout' | 'Delete'
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
