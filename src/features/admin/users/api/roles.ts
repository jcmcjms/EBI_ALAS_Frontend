import { apiClient } from '@/src/shared/lib/apiClient'
import {
  unwrapApiData,
  type ApiResponse,
} from '@/src/shared/lib/api/types'
import type { RoleInfo } from './users-types'

export type { RoleInfo }

export async function listRoles(): Promise<RoleInfo[]> {
  const res = await apiClient.get<ApiResponse<RoleInfo[]>>('/api/roles')
  return unwrapApiData(res.data)
}
