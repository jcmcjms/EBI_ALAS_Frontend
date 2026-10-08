import { useQuery } from '@tanstack/react-query'
import { roleKeys } from '@/src/features/admin/users/api/user-queries'
import { listRoles, type RoleInfo } from '../api/roles'

const REFERENCE_STALE_TIME = 60 * 60_000

export function useRoles(): {
  data: RoleInfo[]
  isLoading: boolean
  error: unknown
} {
  const query = useQuery({
    queryKey: roleKeys.all,
    queryFn: listRoles,
    staleTime: REFERENCE_STALE_TIME,
  })
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
