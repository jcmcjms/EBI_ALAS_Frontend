import { apiClient } from '@/src/shared/lib/apiClient'
import type { PagedResult } from '@/src/shared/lib/api/types'
import { buildActivityQuery, type ActivityFilters } from './activity-query'

export interface AccountProfile {
  id: string | number
  username: string
  firstName: string
  middleName?: string
  lastName: string
  branchId: string
  role: string
  email?: string
  phone?: string
  emergencyContact?: string
  eSignature?: string | null
  profilePhotoUrl?: string
  createdAt: string
  passwordChangedAt?: string
  stats: AccountStats
  isAvailable?: boolean
}

export interface AccountStats {
  processedLoans: number
  pendingLoans: number
  approvalRate: number
}

export interface Session {
  id: string | number

  deviceInfo: string | null
  ipAddress?: string | null
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

export type PagedSessionsResponse = PagedResult<Session>

export interface Activity {
  id: string | number

  lamId: string
  action: string
  fromStatus?: string
  toStatus?: string
  comments?: string
  actionDate: string
  loanClientName: string
  isInformal?: boolean
}

export interface ProcessedLoan {
  id: string | number
  lamId: string
  clientName: string
  status: string
  applicationDate: string
  proposedAmount: number
}

export interface UpdateProfilePayload {
  email: string | null
  phone: string | null
  emergencyContact: string | null
  eSignature: string | null
}

export interface RecentClient {
  cisId: string | null
  name: string
  agency: string
  lastInteraction: string
}

export async function getAccountProfile(): Promise<AccountProfile> {
  const response = await apiClient.get('/api/account/me')
  return response.data
}

export async function updateAccountProfile(
  data: UpdateProfilePayload,
): Promise<void> {
  await apiClient.put('/api/account/me', data)
}

export async function setMyDutyAvailability(available: boolean): Promise<void> {
  await apiClient.put('/api/account/me/availability', { available })
}

export async function getAccountSessions(
  pageNumber = 1,
  pageSize = 10,
): Promise<PagedSessionsResponse> {
  const response = await apiClient.get(
    `/api/account/me/sessions?pageNumber=${pageNumber}&pageSize=${pageSize}`,
  )
  return response.data
}

export async function revokeAccountSession(
  sessionId: string | number,
): Promise<void> {
  await apiClient.delete(`/api/account/me/sessions/${sessionId}`)
}

export async function revokeOtherSessions(): Promise<number> {
  const response = await apiClient.delete('/api/account/me/sessions/others')
  return response.data?.revokedCount ?? 0
}

export async function getAccountActivity(
  limit = 10,
  filters: ActivityFilters = {},
): Promise<Activity[]> {
  const query = buildActivityQuery(limit, filters)
  const response = await apiClient.get(`/api/account/me/activity?${query}`)
  return response.data
}

export async function getAccountLoans(limit = 10): Promise<ProcessedLoan[]> {
  const response = await apiClient.get(`/api/account/me/loans?limit=${limit}`)
  return response.data
}

export async function getAccountClients(limit = 5): Promise<RecentClient[]> {
  const response = await apiClient.get(`/api/account/me/clients?limit=${limit}`)
  return response.data
}
