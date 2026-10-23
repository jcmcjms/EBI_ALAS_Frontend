import { apiClient } from '@/src/shared/lib/apiClient'
import { approvalMatrixKeys } from '@/src/shared/lib/api/approval-matrix-shared'

export type AuthoritySeverity = 0 | 1 | 2
export type AuthorityScope = 0 | 1 | 2

export interface AssignedApproverUser {
  userId: string
  name: string
}

export interface ApprovalAuthorityDto {
  key: string
  displayName: string
  tier: number
  priority: number
  allowNew: boolean
  allowRenewal: boolean
  maxSeverity: AuthoritySeverity
  maxTotalExposure: number
  scopeType: AuthorityScope
  assignedUsers: AssignedApproverUser[]
}

export interface AuthorityLimitsPayload {
  displayName: string
  tier: number
  priority: number
  allowNew: boolean
  allowRenewal: boolean
  maxSeverity: number
  maxTotalExposure: number
  scopeType: number
}

export const SEVERITY_LABELS: Record<AuthoritySeverity, string> = {
  0: 'None',
  1: 'Minor',
  2: 'Major',
}

export const SCOPE_LABELS: Record<AuthorityScope, string> = {
  0: 'Branch',
  1: 'Area',
  2: 'Global',
}

export function mapApproverUser(user: {
  id: string
  firstName: string
  lastName: string
}): { id: string; name: string } {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return { id: user.id, name }
}

export async function getApprovalAuthorities(): Promise<ApprovalAuthorityDto[]> {
  const res = await apiClient.get<ApprovalAuthorityDto[]>(
    '/api/approval-authorities',
  )
  return res.data
}

export async function createApprovalAuthority(
  payload: AuthorityLimitsPayload,
): Promise<ApprovalAuthorityDto> {
  const res = await apiClient.post<ApprovalAuthorityDto>(
    '/api/approval-authorities',
    payload,
  )
  return res.data
}

export async function updateApprovalAuthority(
  key: string,
  payload: AuthorityLimitsPayload,
): Promise<ApprovalAuthorityDto> {
  const res = await apiClient.put<ApprovalAuthorityDto>(
    `/api/approval-authorities/${encodeURIComponent(key)}`,
    payload,
  )
  return res.data
}

export async function deactivateApprovalAuthority(key: string): Promise<void> {
  await apiClient.delete(`/api/approval-authorities/${encodeURIComponent(key)}`)
}

export async function setApprovalAuthorityUsers(
  key: string,
  userIds: string[],
): Promise<ApprovalAuthorityDto> {
  const res = await apiClient.put<ApprovalAuthorityDto>(
    `/api/approval-authorities/${encodeURIComponent(key)}/users`,
    { userIds },
  )
  return res.data
}

interface ApproverUserPage {
  items: { id: string; firstName: string; lastName: string }[]
}

export async function listApproverUsers(): Promise<
  { id: string; name: string }[]
> {
  const res = await apiClient.get<ApproverUserPage>('/api/users', {
    params: { role: 'Approver', pageSize: 200 },
  })
  return res.data.items.map(mapApproverUser)
}

export const approvalAuthorityKeys = {
  list: approvalMatrixKeys.authorities,
  approverUsers: () => ['approval-authorities', 'approver-users'] as const,
}
