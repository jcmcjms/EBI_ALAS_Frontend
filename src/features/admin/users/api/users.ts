import { apiClient } from '@/src/shared/lib/apiClient'
import type { PagedResult } from '@/src/shared/lib/api/types'
import type {
  BackendPageResult,
  BackendUserDto,
  CreateUserPayload,
  UpdateUserPayload,
  UserImportResult,
  UserQueryParams,
  UserResponse,
} from './users-types'
import { splitFullName, toUserResponse } from './users-types'

export type {
  CreateUserPayload,
  UpdateUserPayload,
  UserQueryParams,
  UserResponse,
  UserAuditLogResponse,
  ResetPasswordResponse,
  UserImportValidationError,
  UserImportResult,
} from './users-types'

function toPagedResult(
  page: BackendPageResult<BackendUserDto>,
): PagedResult<UserResponse> {
  return {
    items: page.items.map(toUserResponse),
    currentPage: page.page,
    pageSize: page.pageSize,
    totalCount: page.totalCount,
    totalPages: page.totalPages,
    hasPreviousPage: page.page > 1,
    hasNextPage: page.page < page.totalPages,
  }
}

function toCreateBody(payload: CreateUserPayload) {
  const fullName = [payload.firstName, payload.middleName, payload.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  return {
    userName: payload.username,
    password: payload.password,
    fullName,
    email: payload.email ?? null,
    branchId: payload.branchId,
    role: payload.role,
  }
}

function toUpdateBody(payload: UpdateUserPayload) {
  const fullName = [payload.firstName, payload.middleName, payload.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  return {
    fullName,
    email: payload.email ?? null,
    branchId: payload.branchId,
  }
}

export async function listUsers(
  params: UserQueryParams,
): Promise<PagedResult<UserResponse>> {
  const res = await apiClient.get<BackendPageResult<BackendUserDto>>(
    '/api/users',
    {
      params: {
        page: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    },
  )
  return toPagedResult(res.data)
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
  const dto =
    res.data && typeof res.data === 'object' && 'user' in res.data
      ? res.data.user
      : (res.data as BackendUserDto)
  return toUserResponse(dto)
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
): Promise<void> {
  await apiClient.post(`/api/users/${id}/${isActive ? 'activate' : 'suspend'}`)
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

export { splitFullName, toUserResponse }
