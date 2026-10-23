import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/src/shared/lib/apiClient'
import {
  getWorkflowConfiguration,
  workflowKeys,
} from '@/src/shared/lib/api/workflow-shared'


export interface SignatureSlotDto {
  order: number
  action: string
  role: string
  jobTitle: string
  signedByName: string | null
  signedByJobTitle: string | null
  signedAt: string | null
  
  signatureUrl: string | null
}


export type LoanSignatureSlot = SignatureSlotDto

export interface SignatureSlot {
  role: string
  label: string
  userName: string | null
  signedAt: string | null
  signatureUrl: string | null
}


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

export function filterVisibleSignatureSlots(
  slots: SignatureSlotDto[],
  requireRecommendation: boolean | undefined,
): SignatureSlotDto[] {
  if (requireRecommendation !== false) return slots
  return slots.filter((s) => s.role.toLowerCase() !== 'recommender')
}

export function useSignatureChain() {
  const query = useQuery({
    queryKey: signatureKeys.chain,
    queryFn: getSignatureChain,
    staleTime: 3_600_000,
  })
  const workflow = useQuery({
    queryKey: workflowKeys.configuration,
    queryFn: getWorkflowConfiguration,
    staleTime: 60_000,
  })
  return {
    ...query,
    data: useMemo(
      () =>
        filterVisibleSignatureSlots(
          query.data ?? [],
          workflow.data?.requireRecommendation,
        ),
      [query.data, workflow.data?.requireRecommendation],
    ),
  }
}

export function useLoanSignatureChain(loanId?: number | string) {
  const enabled =
    loanId != null && loanId !== '' && loanId !== 'NaN' && loanId !== 'undefined'
  const query = useQuery({
    queryKey: signatureKeys.loan(loanId ?? 'none'),
    queryFn: () => getLoanSignatureChain(loanId!),
    enabled,
    staleTime: 60_000,
  })
  const workflow = useQuery({
    queryKey: workflowKeys.configuration,
    queryFn: getWorkflowConfiguration,
    staleTime: 60_000,
  })
  return {
    ...query,
    data: useMemo(
      () =>
        filterVisibleSignatureSlots(
          query.data ?? [],
          workflow.data?.requireRecommendation,
        ),
      [query.data, workflow.data?.requireRecommendation],
    ),
  }
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
