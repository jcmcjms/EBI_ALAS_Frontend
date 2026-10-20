import { apiClient, buildAuthHeaders } from '@/src/shared/lib/apiClient'
import { env } from '@/src/shared/config/env'

export interface ReviewDraftDto {
  remarks: string
  updatedAt: string
}

function draftUrl(loanId: string | number): string {
  return `/api/loans/${loanId}/review-draft`
}

export async function getReviewDraft(
  loanId: string | number,
): Promise<ReviewDraftDto | null> {
  const res = await apiClient.get<ReviewDraftDto | ''>(draftUrl(loanId))
  if (res.status === 204 || !res.data) return null
  return res.data
}

export async function saveReviewDraft(
  loanId: string | number,
  remarks: string,
): Promise<ReviewDraftDto | null> {
  const res = await apiClient.put<ReviewDraftDto | ''>(draftUrl(loanId), {
    remarks,
  })
  if (res.status === 204 || !res.data) return null
  return res.data
}

export async function deleteReviewDraft(
  loanId: string | number,
): Promise<void> {
  await apiClient.delete(draftUrl(loanId))
}

/**
 * Fire-and-forget save using fetch keepalive so the draft survives the page
 * being torn down (tab close, refresh, back navigation). Used on pagehide.
 */
export function saveReviewDraftKeepalive(
  loanId: string | number,
  remarks: string,
): void {
  try {
    void fetch(`${env.apiBaseUrl ?? ''}${draftUrl(loanId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
      },
      body: JSON.stringify({ remarks }),
      keepalive: true,
      credentials: 'include',
    }).catch(() => {
      /* offline — the localStorage fallback keeps the copy */
    })
  } catch {
    /* fetch itself unavailable — nothing more we can do */
  }
}
