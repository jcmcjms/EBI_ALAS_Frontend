import { apiClient } from '@/src/shared/lib/apiClient'
import {
  unwrapApiData,
  type ApiResponse,
  type RoleInfo,
} from '@/src/shared/lib/api/types'

export type { RoleInfo }

export async function listRoles(): Promise<RoleInfo[]> {
  const res = await apiClient.get<ApiResponse<RoleInfo[]>>('/api/roles')
  return unwrapApiData(res.data)
}
