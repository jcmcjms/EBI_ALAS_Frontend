import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import {
  getDocumentRemarks,
  postDocumentRemark,
  getDocumentChecklist,
  type DocumentRemarkDto,
  type DocumentChecklistItem,
} from '@/src/features/loans/api/loan-review'

export function useDocumentRemarks(loanId: number) {
  const qc = useQueryClient()
  const query = useQuery<DocumentRemarkDto[]>({
    queryKey: loanKeys.documentRemarks(loanId),
    queryFn: () => getDocumentRemarks(loanId),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })

  const mutate = useMutation({
    mutationFn: (payload: {
      checklistIdCode: string
      body: string
      parentRemarkId?: number
    }) => postDocumentRemark(loanId, payload),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: loanKeys.documentRemarks(loanId),
      }),
  })

  return { ...query, postRemark: mutate }
}

export function useDocumentChecklist(loanId: number) {
  return useQuery<DocumentChecklistItem[]>({
    queryKey: loanKeys.documentChecklist(loanId),
    queryFn: () => getDocumentChecklist(loanId),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}
