import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'

/**
 * Workflow template signature chain — `GET /api/workflow/signature-chain`.
 * Encoder always; Recommender only when recommendation is required.
 * Used on the printable approval form preview.
 */
export interface SignatureSlotDto {
  order: number
  action: string
  role: string
  jobTitle: string
  signedByName: string | null
  signedByJobTitle: string | null
  signedAt: string | null
}

/**
 * Per-loan signature chain — `GET /api/loans/{id}/signature-chain`.
 * Always the 3 printable slots; signed fields filled when a stage completed.
 */
export type LoanSignatureSlot = SignatureSlotDto

export interface SignatureSlot {
  role: string
  label: string
  userName: string | null
  signedAt: string | null
  signatureUrl: string | null
}

/** Display slots for the approval form: printable fields plus optional ink URL. */
export type SignatureDisplaySlot = SignatureSlotDto & {
  signatureUrl?: string | null
}

export const signatureKeys = {
  chain: ['workflow', 'signature-chain'] as const,
  loan: (loanId: number | string) => ['loans', loanId, 'signature-chain'] as const,
}

export async function getSignatureChain(): Promise<SignatureSlotDto[]> {
  const res = await apiClient.get<SignatureSlotDto[]>(
    '/api/workflow/signature-chain',
  )
  return res.data
}

export async function getLoanSignatureChain(
  loanId: number | string,
): Promise<LoanSignatureSlot[]> {
  const res = await apiClient.get<LoanSignatureSlot[]>(
    `/api/loans/${loanId}/signature-chain`,
  )
  return res.data
}

export function useSignatureChain() {
  return useQuery({
    queryKey: signatureKeys.chain,
    queryFn: getSignatureChain,
    staleTime: 3_600_000,
  })
}

export function useLoanSignatureChain(loanId?: number | string) {
  const enabled =
    loanId != null && loanId !== '' && loanId !== 'NaN' && loanId !== 'undefined'
  return useQuery({
    queryKey: signatureKeys.loan(loanId ?? 'none'),
    queryFn: () => getLoanSignatureChain(loanId!),
    enabled,
    staleTime: 60_000,
  })
}

interface DraftUser {
  firstName: string
  middleName: string
  lastName: string
  jobTitle: string | null
}

function draftEncoderName(user: DraftUser): string {
  const parts = [user.lastName, user.firstName, user.middleName].filter(Boolean)
  return parts.join(', ').toUpperCase()
}

export function withDraftEncoder(
  slots: SignatureSlotDto[],
  user: DraftUser | null,
): SignatureSlotDto[] {
  if (!user) return slots
  return slots.map((s) =>
    s.role === 'Encoder' && !s.signedByName
      ? {
          ...s,
          signedByName: draftEncoderName(user),
          signedByJobTitle: user.jobTitle || s.jobTitle,
        }
      : s,
  )
}
