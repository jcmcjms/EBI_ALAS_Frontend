import { apiClient } from '@/src/shared/lib/apiClient'
import type { BackendRoleCatalogItem, RoleInfo } from './users-types'

export type { RoleInfo }

export async function listRoles(): Promise<RoleInfo[]> {
  const res = await apiClient.get<BackendRoleCatalogItem[]>('/api/roles')
  return res.data.map((item) => ({
    name: item.role,
    displayName: item.role,
  }))
}
