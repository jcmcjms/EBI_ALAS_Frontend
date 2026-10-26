import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { apiClient } from '@/src/shared/lib/apiClient'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { loanReviewKeys } from '@/src/features/loans/api/loan-review'
import { approvalMatrixKeys } from '@/src/shared/lib/api/approval-matrix-shared'

interface VerifyDocumentsResult {
  complete: boolean
  missing: string[]
  documentsCompleteAt: string | null
}

export function useVerifyDocuments(loanId: number | string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<VerifyDocumentsResult>>(
        `/api/loans/${loanId}/documents/verify`,
      )
      return unwrapApiData(res.data)
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: loanKeys.all })

      if (loanId !== null) {
        qc.invalidateQueries({ queryKey: approvalMatrixKeys.routing(loanId) })
        qc.invalidateQueries({
          queryKey: loanReviewKeys.checklistDocuments(loanId),
        })
      }
      if (r.complete) {
        toastSuccess('All required documents are uploaded.')
      } else {
        toastError(`${r.missing.length} ${r.missing.length === 1 ? 'document is' : 'documents are'} still missing.`)
      }
    },
    onError: (e: Error) => toastError(e.message),
  })
}
