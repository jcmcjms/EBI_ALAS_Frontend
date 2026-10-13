import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'

export interface DeviationCatalogItemDto {
  id: number
  description: string
  /** 1 = Minor, 2 = Major (matches DeviationSeverity in the API). */
  severity: 0 | 1 | 2
}

export const approvalMatrixKeys = {
  authorities: () => ['approval-matrix', 'authorities'] as const,
  deviationCatalog: () => ['approval-matrix', 'deviation-catalog'] as const,
  presence: () => ['presence', 'approvers'] as const,
  routing: (id: number | string) => ['loans', id, 'routing'] as const,
}

/** Bare array — the API does not wrap this payload in an ApiResponse envelope. */
export async function getDeviationCatalog(): Promise<
  DeviationCatalogItemDto[]
> {
  const res = await apiClient.get<DeviationCatalogItemDto[]>(
    '/api/deviation-catalog',
  )
  return Array.isArray(res.data) ? res.data : []
}

export function useDeviationCatalog(enabled = true) {
  return useQuery<DeviationCatalogItemDto[]>({
    queryKey: approvalMatrixKeys.deviationCatalog(),
    queryFn: getDeviationCatalog,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/** Major = 2, Minor = 1. Tolerates numeric strings from JSON. */
export function isMajorSeverity(severity: number | string): boolean {
  return Number(severity) === 2
}

export function isMinorSeverity(severity: number | string): boolean {
  return Number(severity) === 1
}
