/** Raw DTO row from GET /api/presence/online (no ApiResponse envelope). */
export interface PresenceApiRow {
  userId: string
  name: string
  role: string
  branchCode: string
  jobTitle?: string | null
  connections: number
}

export interface PresenceUser {
  userId: string
  name: string
  role: string
  branchCode: string
  jobTitle?: string | null
  connections: number
}

export function mapPresencePayload(row: PresenceApiRow): PresenceUser {
  return {
    userId: row.userId,
    name: row.name,
    role: row.role,
    branchCode: row.branchCode,
    jobTitle: row.jobTitle ?? null,
    connections: row.connections,
  }
}
