import { apiClient, buildAuthHeaders } from '@/src/shared/lib/apiClient'
import { env } from '@/src/shared/config/env'

export interface LoanCreationDraftDto {
  payload: string
  updatedAt: string
}

const draftUrl = '/api/loans/creation-draft'

export async function getLoanCreationDraft(): Promise<LoanCreationDraftDto | null> {
  const res = await apiClient.get<LoanCreationDraftDto | ''>(draftUrl)
  if (res.status === 204 || !res.data) return null
  return res.data
}

export async function saveLoanCreationDraft(
  payload: string,
): Promise<LoanCreationDraftDto | null> {
  const res = await apiClient.put<LoanCreationDraftDto | ''>(draftUrl, { payload })
  if (res.status === 204 || !res.data) return null
  return res.data
}

export async function deleteLoanCreationDraft(): Promise<void> {
  await apiClient.delete(draftUrl)
}

/**
 * Fire-and-forget save using fetch keepalive so the draft survives the page
 * being torn down (tab close, refresh, back navigation). Used on pagehide.
 */
export function saveLoanCreationDraftKeepalive(payload: string): void {
  try {
    void fetch(`${env.apiBaseUrl ?? ''}${draftUrl}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
      },
      body: JSON.stringify({ payload }),
      keepalive: true,
      credentials: 'include',
    }).catch(() => {
      /* offline — the localStorage fallback keeps the copy */
    })
  } catch {
    /* fetch itself unavailable — nothing more we can do */
  }
}
