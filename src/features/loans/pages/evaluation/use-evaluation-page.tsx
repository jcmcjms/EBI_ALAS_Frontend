import { useMemo, useState } from 'react'
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
  updateLoanStatus,
  flagDocuments,
  getChecklistDocuments,
  pushbackWithRevision,
} from '@/src/features/loans/api/loan-review'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'
import {
  useLoanSignatureChain,
  signatureKeys,
} from '@/src/features/loans/api/signatures'
import { mapLoanDetailToFormData } from '@/src/features/loans/model/map-detail-to-form'
import type { LoanStatus } from '@/src/features/loans/model/loan-status'
import type { RevisionSectionId } from '@/src/features/loans/types/revision-request'
import { apiClient } from '@/src/shared/lib/apiClient'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'

export type EvaluationAction = 'recommended' | 'notRecommended' | 'pushback'

const TERMINAL = ['Approved', 'Rejected', 'Disbursed', 'OnGoing']

export function useEvaluationPage(id: number) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [comments, setComments] = useState('')
  const [pendingAction, setPendingAction] = useState<EvaluationAction | null>(null)
  const [flagOpen, setFlagOpen] = useState(false)
  const [pushbackOpen, setPushbackOpen] = useState(false)

  useEntityViewers('LoanApplication', Number.isFinite(id) && id > 0 ? id : null)

  const loan = useQuery({
    queryKey: loanKeys.review.detail(id),
    queryFn: () => getLoanDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  })

  const checklist = useQuery({
    queryKey: loanKeys.review.checklistDocuments(id),
    queryFn: () => getChecklistDocuments(id),
    enabled: Number.isFinite(id) && id > 0,
  })

  const history = useQuery({
    queryKey: loanKeys.review.history(id),
    queryFn: () => getLoanHistory(id),
    enabled: Number.isFinite(id) && id > 0,
  })

  const { data: signatureSlots } = useLoanSignatureChain(id)

  const detail = loan.data
  const frozen = detail ? TERMINAL.includes(detail.status) : false
  const formData = useMemo(
    () => (detail ? mapLoanDetailToFormData(detail) : null),
    [detail],
  )

  const loanClass = useCatLoanClass(
    detail?.branchCode ?? '',
    detail?.loanNo ?? '',
    parseProductCode(detail?.product ?? ''),
  )

  const updateStatus = useMutation({
    mutationFn: ({ status, comments }: { status: string; comments: string }) =>
      updateLoanStatus(id, { status: status as LoanStatus, comments }),
    onSuccess: (_data, { status }) => {
      const actionLabel =
        status === 'ForApproval'
          ? 'forwarded to Approver'
          : 'Pushed back to Encoder'
      toastSuccess(`Application ${actionLabel}.`)
      setComments('')
      setPendingAction(null)
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(id) })
      qc.invalidateQueries({ queryKey: loanKeys.review.history(id) })
      qc.invalidateQueries({ queryKey: loanKeys.all })
      qc.invalidateQueries({ queryKey: signatureKeys.loan(id) })
    },
    onError: (e: Error) => {
      if (axios.isAxiosError(e) && e.response?.data) {
        const data = e.response.data as {
          message?: string
          errors?: string[]
        }
        const msg = data.message || getErrorMessage(e)
        const details =
          Array.isArray(data.errors) && data.errors.length > 0
            ? data.errors
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
      } else {
        toastError(getErrorMessage(e))
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
          ? 'All requirements uploaded — flag cleared.'
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
        'Documents flagged — the encoder has been notified. Review continues.',
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
      toastSuccess('Application pushed back with revision instructions.')
      setPushbackOpen(false)
      setPendingAction(null)
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

    if (action === 'notRecommended' && trimmed.length < 10) {
      toastError(
        'Comments are required (minimum 10 characters) for this action.',
      )
      return
    }

    setPendingAction(action)

    const finalComments =
      action === 'notRecommended'
        ? trimmed
        : trimmed || 'Recommended for approval.'
    updateStatus.mutate({ status: 'ForApproval', comments: finalComments })
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

  const commentsRequired = pendingAction === 'notRecommended'
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
  }
}