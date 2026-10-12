import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'

/**
 * Workflow template signature chain — `GET /api/workflow/signature-chain`.
 * Static 3-row preview (Recommend / Evaluate / Approve) used on the
 * printable approval form.
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
 * Who actually signed each stage of a specific application.
 */
export interface LoanSignatureSlot {
  id: string
  order: number
  roleName: string
  status: string
  signedAt: string | null
  userId: string | null
}

export interface SignatureSlot {
  role: string
  label: string
  userName: string | null
  signedAt: string | null
  signatureUrl: string | null
}

/** Either chain can feed the printable form's signature blocks. */
export type SignatureDisplaySlot = SignatureSlotDto | LoanSignatureSlot

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
  return useQuery({
    queryKey: signatureKeys.loan(loanId ?? 0),
    queryFn: () => getLoanSignatureChain(loanId!),
    enabled: loanId != null && loanId !== '' && Number(loanId) !== 0,
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
