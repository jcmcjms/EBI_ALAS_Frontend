import { useMemo, useState } from 'react'
import { useReviewDraft } from '@/src/features/loans/hooks/use-review-draft'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'

import { useAuthStore } from '@/src/shared/store/auth-store'
import { useEntityViewers } from '@/src/shared/lib/signalr/use-presence'
import { useCatLoanClass } from '@/src/features/loans/hooks/use-cat-loan-class'
import { parseProductCode } from '@/src/features/loans/model/loan-product-display'
import {
  getLoanDetail,
  getLoanHistory,
  evaluateLoan,
  pushbackWithRevision,
  flagDocuments,
  getChecklistDocuments,
} from '@/src/features/loans/api/loan-review'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'
import {
  useLoanSignatureChain,
  signatureKeys,
} from '@/src/features/loans/api/signatures'
import { useMySignerSignature } from '@/src/features/loans/api/signer-signature'
import { mapLoanDetailToFormData } from '@/src/features/loans/model/map-detail-to-form'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import type { RevisionSectionId } from '@/src/features/loans/types/revision-request'
import { apiClient } from '@/src/shared/lib/apiClient'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'

export type EvaluationAction = 'recommended' | 'notRecommended' | 'pushback'

const TERMINAL = ['Approved', 'Rejected', 'Disbursed', 'OnGoing']

export function useEvaluationPage(id: string) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const hasLoanId = Boolean(id) && id !== 'NaN' && id !== 'undefined'

  const [pendingAction, setPendingAction] = useState<EvaluationAction | null>(null)
  const [flagOpen, setFlagOpen] = useState(false)
  const [pushbackOpen, setPushbackOpen] = useState(false)

  useEntityViewers('LoanApplication', hasLoanId ? id : null)

  const loan = useQuery({
    queryKey: loanKeys.review.detail(id),
    queryFn: () => getLoanDetail(id),
    enabled: hasLoanId,
  })

  const checklist = useQuery({
    queryKey: loanKeys.review.checklistDocuments(id),
    queryFn: () => getChecklistDocuments(id),
    enabled: hasLoanId,
  })

  const history = useQuery({
    queryKey: loanKeys.review.history(id),
    queryFn: () => getLoanHistory(id),
    enabled: hasLoanId,
  })

  const { data: signatureSlots } = useLoanSignatureChain(id)
  const { data: mySignature } = useMySignerSignature()

  const detail = loan.data
  const frozen = detail ? TERMINAL.includes(detail.status) : false

  // Auto-saved evaluation notes: server draft with an on-device fallback copy.
  const draft = useReviewDraft({
    loanId: hasLoanId ? id : null,
    enabled: hasLoanId && !!detail && !frozen,
  })
  const comments = draft.value
  const setComments = draft.setValue

  const formData = useMemo(() => {
    if (!detail) return null
    if (detail.form) {
      return detail.form as LoanApplicationFormData
    }
    return mapLoanDetailToFormData(detail)
  }, [detail])

  const loanClass = useCatLoanClass(
    detail?.branchCode ?? '',
    detail?.loanNo ?? '',
    parseProductCode(detail?.product ?? ''),
  )

  const updateStatus = useMutation({
    mutationFn: ({
      recommend,
      remarks,
    }: {
      recommend: boolean
      remarks?: string
    }) => evaluateLoan(id, recommend, remarks),
    onSuccess: (_data, { recommend }) => {
      toastSuccess(
        recommend
          ? 'Application forwarded to the Approver.'
          : 'Recorded as Not Recommended and forwarded to the Approver.',
      )
      draft.clear()
      setPendingAction(null)
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(id) })
      qc.invalidateQueries({ queryKey: loanKeys.review.history(id) })
      qc.invalidateQueries({ queryKey: loanKeys.all })
      qc.invalidateQueries({ queryKey: signatureKeys.loan(id) })
    },
    onError: (e: Error) => {
      const problem = axios.isAxiosError(e)
        ? (e.response?.data as {
            detail?: string
            errors?: string[]
          } | undefined)
        : undefined
      const msg = getErrorMessage(e)
      const details =
        Array.isArray(problem?.errors) && problem.errors.length > 0
          ? problem.errors
          : null

      if (details) {
        toastError(
          <div className="space-y-1.5">
            <p className="font-semibold">{msg}</p>
            <ul className="list-disc pl-4 text-xs opacity-90">
              {details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>,
          { timeout: 10_000 },
        )
      } else {
        toastError(msg)
      }
      setPendingAction(null)
    },
  })

  const recheck = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<
        ApiResponse<{ complete: boolean; missing: string[] }>
      >(`/api/loans/${id}/documents/verify`)
      return unwrapApiData(res.data)
    },
    onSuccess: (r) => {
      toastSuccess(
        r.complete
          ? 'All requirements uploaded. The flag has been cleared.'
          : `Still missing: ${r.missing.join(', ')}`,
      )
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(id) })
      qc.invalidateQueries({
        queryKey: loanKeys.review.checklistDocuments(id),
      })
      qc.invalidateQueries({ queryKey: loanKeys.all })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })

  const flagDocs = useMutation({
    mutationFn: ({ codes, reason }: { codes: string[]; reason: string }) =>
      flagDocuments(id, { missingRequirementCodes: codes, reason }),
    onSuccess: () => {
      toastSuccess(
        'Documents flagged. The encoder has been notified, and you can keep reviewing.',
      )
      setFlagOpen(false)
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(id) })
      qc.invalidateQueries({ queryKey: loanKeys.review.timeline(id) })
      qc.invalidateQueries({
        queryKey: loanKeys.review.checklistDocuments(id),
      })
      qc.invalidateQueries({ queryKey: queryKeys.dashboardRoot })
      qc.invalidateQueries({ queryKey: loanKeys.all })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })

  const pushbackMutation = useMutation({
    mutationFn: (payload: {
      sections: { sectionId: RevisionSectionId; comments: string }[]
      overallComments: string
    }) => pushbackWithRevision(id, payload),
    onSuccess: () => {
      toastSuccess('Application pushed back for revision.')
      setPushbackOpen(false)
      setPendingAction(null)
      draft.clear()
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(id) })
      qc.invalidateQueries({ queryKey: loanKeys.review.history(id) })
      qc.invalidateQueries({ queryKey: loanKeys.revisionRequests(id) })
      qc.invalidateQueries({ queryKey: loanKeys.all })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })

  const handleAction = (action: EvaluationAction) => {
    if (action === 'pushback') {
      setPushbackOpen(true)
      return
    }

    const trimmed = comments.trim()

    if (
      (action === 'notRecommended' || action === 'recommended') &&
      trimmed.length < 10
    ) {
      toastError('Your remarks need at least 10 characters for this action.')
      return
    }

    setPendingAction(action)

    updateStatus.mutate({
      recommend: action === 'recommended',
      remarks: trimmed || undefined,
    })
  }

  const handlePushbackSubmit = (payload: {
    sections: { sectionId: RevisionSectionId; comments: string }[]
    overallComments: string
  }) => {
    pushbackMutation.mutate(payload)
  }

  const isEvaluator = user?.role === 'Evaluator'
  const isForChecking = detail?.status === 'ForChecking'
  const showEvaluatorActions = isEvaluator && isForChecking && !frozen

  const commentsRequired = showEvaluatorActions
  const canAct =
    (!commentsRequired || comments.trim().length >= 10) &&
    !updateStatus.isPending &&
    !pushbackMutation.isPending

  return {
    user,
    comments,
    setComments,
    pendingAction,
    flagOpen,
    setFlagOpen,
    frozen,
    loan,
    checklist,
    history,
    signatureSlots,
    mySignature,
    detail,
    formData,
    loanClass,
    updateStatus,
    recheck,
    flagDocs,
    handleAction,
    pushbackOpen,
    setPushbackOpen,
    pushbackMutation,
    handlePushbackSubmit,
    isEvaluator,
    showEvaluatorActions,
    commentsRequired,
    canAct,
    draftStatus: draft.status,
    draftSavedAt: draft.savedAt,
    draftError: draft.errorMessage,
    retryDraftSave: draft.retry,
  }
}