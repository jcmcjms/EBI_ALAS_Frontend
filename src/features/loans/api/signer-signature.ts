import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'

export const signerSignatureKeys = {
  mine: ['account', 'profile', 'esignature'] as const,
}

const PNG_DATA_URL_PREFIX = 'data:image/png;'

/**
 * Current user's saved profile signature for workflow confirmation UI.
 * Backend remains authoritative for signing; this is display + UX gating only.
 */
export function useMySignerSignature() {
  return useQuery({
    queryKey: signerSignatureKeys.mine,
    queryFn: async (): Promise<string | null> => {
      const res = await apiClient.get<{ eSignature?: string | null }>(
        '/api/account/me',
      )
      return res.data?.eSignature ?? null
    },
    staleTime: 60_000,
    select: (data) =>
      data && data.startsWith(PNG_DATA_URL_PREFIX) ? data : null,
  })
}
