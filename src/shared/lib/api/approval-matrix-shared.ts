import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'

export interface DeviationCatalogItemDto {
  id: number
  description: string
  severity: 0 | 1 | 2
}

export const approvalMatrixKeys = {
  authorities: () => ['approval-matrix', 'authorities'] as const,
  deviationCatalog: () => ['approval-matrix', 'deviation-catalog'] as const,
  presence: () => ['presence', 'approvers'] as const,
  routing: (id: number) => ['loans', id, 'routing'] as const,
}

export async function getDeviationCatalog(): Promise<
  DeviationCatalogItemDto[]
> {
  const res = await apiClient.get<ApiResponse<DeviationCatalogItemDto[]>>(
    '/api/deviation-catalog',
  )
  return unwrapApiData(res.data)
}

export function useDeviationCatalog(enabled = true) {
  return useQuery<DeviationCatalogItemDto[]>({
    queryKey: approvalMatrixKeys.deviationCatalog(),
    queryFn: getDeviationCatalog,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}