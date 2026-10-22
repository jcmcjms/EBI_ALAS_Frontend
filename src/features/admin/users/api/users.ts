import { apiClient } from '@/src/shared/lib/apiClient'
import {
  mapPageResult,
  type BackendPageResult,
  type PagedResult,
} from '@/src/shared/lib/api/types'
import type {
  BackendUserDto,
  CreateUserPayload,
  ResetPasswordResponse,
  UpdateUserPayload,
  UserImportResult,
  UserQueryParams,
  UserResponse,
} from './users-types'
import { toUserResponse } from './users-types'

export type {
  CreateUserPayload,
  UpdateUserPayload,
  UserQueryParams,
  UserResponse,
  ResetPasswordResponse,
  UserImportValidationError,
  UserImportResult,
} from './users-types'

function toCreateBody(payload: CreateUserPayload) {
  return {
    userName: payload.username,
    password: payload.password,
    firstName: payload.firstName,
    lastName: payload.lastName,
    middleName: payload.middleName ?? null,
    email: payload.email.trim(),
    branchId: payload.branchId,
    role: payload.role,
    jobTitle: payload.jobTitle?.trim() || null,
  }
}

function toUpdateBody(payload: UpdateUserPayload) {
  return {
    firstName: payload.firstName,
    lastName: payload.lastName,
    middleName: payload.middleName ?? null,
    email: payload.email.trim(),
    branchId: payload.branchId,
    role: payload.role,
    jobTitle: payload.jobTitle?.trim() || null,
  }
}

export async function listUsers(
  params: UserQueryParams,
): Promise<PagedResult<UserResponse>> {
  const search = params.search?.trim()
  const res = await apiClient.get<BackendPageResult<BackendUserDto>>(
    '/api/users',
    {
      params: {
        page: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        ...(search ? { search } : {}),
        ...(params.role ? { role: params.role } : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
      },
    },
  )
  return mapPageResult({
    ...res.data,
    items: res.data.items.map(toUserResponse),
  })
}

export async function getUser(id: string): Promise<UserResponse> {
  const res = await apiClient.get<BackendUserDto>(`/api/users/${id}`)
  return toUserResponse(res.data)
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<UserResponse> {
  const res = await apiClient.post<{ user: BackendUserDto } | BackendUserDto>(
    '/api/users',
    toCreateBody(payload),
  )
  const raw = res.data as { user: BackendUserDto } | BackendUserDto
  const user = 'user' in raw ? raw.user : raw
  return toUserResponse(user)
}

export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<UserResponse> {
  const res = await apiClient.put<BackendUserDto>(
    `/api/users/${id}`,
    toUpdateBody(payload),
  )
  return toUserResponse(res.data)
}

export async function updateUserStatus(
  id: string,
  isActive: boolean,
): Promise<UserResponse> {
  const res = await apiClient.post<BackendUserDto>(
    `/api/users/${id}/${isActive ? 'activate' : 'suspend'}`,
  )
  return toUserResponse(res.data)
}

export async function updateUserAvailability(
  id: string,
  available: boolean,
): Promise<UserResponse> {
  const res = await apiClient.put<BackendUserDto>(
    `/api/users/${id}/availability`,
    { available },
  )
  return toUserResponse(res.data)
}

export async function resetPassword(
  id: string,
): Promise<ResetPasswordResponse> {
  const res = await apiClient.post<ResetPasswordResponse>(
    `/api/users/${id}/reset-password`,
  )
  return res.data
}

export async function forcePasswordReset(id: string): Promise<UserResponse> {
  const res = await apiClient.post<BackendUserDto>(
    `/api/users/${id}/force-password-reset`,
  )
  return toUserResponse(res.data)
}

export async function revokeSessions(id: string): Promise<number> {
  const res = await apiClient.post<{ revokedCount: number }>(
    `/api/users/${id}/revoke-sessions`,
  )
  return res.data.revokedCount
}

export async function setMyAvailability(
  available: boolean,
): Promise<void> {
  await apiClient.put('/api/account/me/availability', { available })
}

export async function importUsers(file: File): Promise<UserImportResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiClient.post<UserImportResult>('/api/users/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function downloadImportTemplate(): Promise<void> {
  const res = await apiClient.get<Blob>('/api/users/import-template', {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = url
  link.download = 'user-import-template.xlsx'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function exportUsers(params: UserQueryParams = {}): Promise<void> {
  void params
  throw new Error('User export is not available on this API yet.')
}

export function formatUserFullName(user: {
  firstName: string
  middleName?: string | null
  lastName: string
}): string {
  return [user.firstName, user.middleName, user.lastName]
    .filter(Boolean)
    .join(' ')
}

export { toUserResponse }
