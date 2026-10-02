import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toastSuccess, toastError } from '@/src/shared/ui/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'

import { useAuthStore } from '@/src/features/auth/store/authStore'
import { useEntityViewers } from '@/src/shared/lib/signalr/use-presence'
import { useCatLoanClass } from '@/src/features/loans/hooks/use-cat-loan-class'
import { parseProductCode } from '@/src/features/loans/utils/loan-product-display'
import {
  getLoanDetail,
  getLoanHistory,
  updateLoanStatus,
  flagDocuments,
  getChecklistDocuments,
} from '@/src/features/loans/api/loan-review'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'
import {
  useLoanSignatureChain,
  signatureKeys,
} from '@/src/features/loans/api/signatures'
import { mapLoanDetailToFormData } from '@/src/features/loans/utils/map-detail-to-form'
import type { LoanStatus } from '@/src/features/loans/utils/loan-status'
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

  useEntityViewers('LoanApplication', Number.isFinite(id) && id > 0 ? id : null)

  const loan = useQuery({
    queryKey: queryKeys.loans.review.detail(id),
    queryFn: () => getLoanDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  })

  const checklist = useQuery({
    queryKey: queryKeys.loans.review.checklistDocuments(id),
    queryFn: () => getChecklistDocuments(id),
    enabled: Number.isFinite(id) && id > 0,
  })

  const history = useQuery({
    queryKey: queryKeys.loans.review.history(id),
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
      qc.invalidateQueries({ queryKey: queryKeys.loans.review.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.loans.review.history(id) })
      qc.invalidateQueries({ queryKey: queryKeys.loans.all })
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
      qc.invalidateQueries({ queryKey: queryKeys.loans.review.detail(id) })
      qc.invalidateQueries({
        queryKey: queryKeys.loans.review.checklistDocuments(id),
      })
      qc.invalidateQueries({ queryKey: queryKeys.loans.all })
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
      qc.invalidateQueries({ queryKey: queryKeys.loans.review.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.loans.review.timeline(id) })
      qc.invalidateQueries({
        queryKey: queryKeys.loans.review.checklistDocuments(id),
      })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.full })
      qc.invalidateQueries({ queryKey: queryKeys.loans.all })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })

  const handleAction = (action: EvaluationAction) => {
    const trimmed = comments.trim()

    if (
      (action === 'pushback' || action === 'notRecommended') &&
      trimmed.length < 10
    ) {
      toastError(
        'Comments are required (minimum 10 characters) for this action.',
      )
      return
    }

    setPendingAction(action)

    if (action === 'pushback') {
      updateStatus.mutate({ status: 'ForRevision', comments: trimmed })
    } else {
      const finalComments =
        action === 'notRecommended'
          ? trimmed
          : trimmed || 'Recommended for approval.'
      updateStatus.mutate({ status: 'ForApproval', comments: finalComments })
    }
  }

  const isEvaluator = user?.role === 'Evaluator'
  const isForChecking = detail?.status === 'ForChecking'
  const showEvaluatorActions = isEvaluator && isForChecking && !frozen

  const commentsRequired =
    pendingAction === 'pushback' || pendingAction === 'notRecommended'
  const canAct =
    (!commentsRequired || comments.trim().length >= 10) &&
    !updateStatus.isPending

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
    isEvaluator,
    showEvaluatorActions,
    commentsRequired,
    canAct,
  }
}