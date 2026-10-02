import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keepPreviousData } from '@tanstack/react-query'
import {
  useClaimById,
  useDeskQueue,
} from '@/src/features/loans/hooks/use-desk-queue'
import { useAuthStore } from '@/src/features/auth/store/authStore'
import { useEntityViewers } from '@/src/shared/lib/signalr/use-presence'
import { useLoanGroup } from '@/src/features/loans/hooks/use-loan-group'
import {
  useLoanSignatureChain,
  signatureKeys,
} from '@/src/features/loans/api/signatures'
import {
  getLoanDetail,
  getChecklistDocuments,
  getDocumentRemarks,
  getLoanDeviations,
  updateLoanStatus,
  cancelLoanApplication,
  flagDocuments,
  CANCELLABLE_STATUSES,
} from '@/src/features/loans/api/loan-review'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'
import { toastError, toastSuccess } from '@/src/shared/ui/toast'
import { apiClient, getErrorMessage } from '@/src/shared/lib/apiClient'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'
import type { LoanStatus } from '@/src/features/loans/utils/loan-status'
import { mapLoanDetailToFormData } from '@/src/features/loans/utils/map-detail-to-form'

import {
  TERMINAL,
  WORKFLOW_ACTIONS,
  type WorkflowButtonDef,
  type WorkflowAction,
} from './workflow-constants'

export function useLoanApprovalPage() {
  const { loanId } = useParams<{ loanId: string }>()
  const id = Number(loanId)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [remarks, setRemarks] = useState('')
  const [zoom, setZoom] = useState(1)
  const [tab, setTab] = useState('workflow')

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelPending, setCancelPending] = useState(false)

  const [flagOpen, setFlagOpen] = useState(false)

  const user = useAuthStore((s) => s.user)
  useEntityViewers('LoanApplication', Number.isFinite(id) && id > 0 ? id : null)

  const loan = useQuery({
    queryKey: queryKeys.loans.review.detail(id),
    queryFn: () => getLoanDetail(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })

  const checklist = useQuery({
    queryKey: queryKeys.loans.review.checklistDocuments(id),
    queryFn: () => getChecklistDocuments(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  })

  const { data: signatureSlots } = useLoanSignatureChain(id)

  const { data: deviationsData } = useQuery({
    queryKey: queryKeys.loans.review.deviations(id),
    queryFn: () => getLoanDeviations(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  })

  const { data: documentRemarksData } = useQuery({
    queryKey: queryKeys.loans.documentRemarks(id),
    queryFn: () => getDocumentRemarks(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  })

  const group = useLoanGroup(loan.data?.applicationGroupNo ?? '')
  const groupLoans = group.data?.loans ?? []

  useEffect(() => {
    setRemarks('')
    setZoom(1)
    setTab('workflow')
    setCancelOpen(false)
    setCancelReason('')
    window.scrollTo({ top: 0 })
  }, [id])

  useEffect(() => {
    for (const sibling of groupLoans) {
      if (sibling.id === id) continue
      void qc.prefetchQuery({
        queryKey: queryKeys.loans.review.detail(sibling.id),
        queryFn: () => getLoanDetail(sibling.id),
      })
    }
  }, [groupLoans, id, qc])

  useEffect(() => {
    document.body.classList.add('print-form-only')
    return () => document.body.classList.remove('print-form-only')
  }, [])

  const detail = loan.data
  const frozen = detail ? TERMINAL.includes(detail.status) : false
  const formData = useMemo(
    () => (detail ? mapLoanDetailToFormData(detail) : null),
    [detail],
  )

  const claimById = useClaimById()
  const { data: desk } = useDeskQueue()
  const queueItem = desk?.items.find((i) => i.loanId === id)
  const queueState = queueItem
    ? {
        isHead: queueItem.isHead,
        ownerUserId: queueItem.ownerUserId,
        ownerName: queueItem.ownerName ?? undefined,
        isMine:
          queueItem.ownerUserId != null &&
          queueItem.ownerUserId ===
            (user?.userId ? Number(user.userId) : undefined),
        position: queueItem.position,
      }
    : undefined

  const needsDeskGate = detail
    ? (detail.status === 'ForRecommendation' && user?.role === 'Recommender') ||
      (detail.status === 'ForChecking' && user?.role === 'Evaluator') ||
      (detail.status === 'ForApproval' && user?.role === 'Approver')
    : false

  const canAct = !needsDeskGate || queueState?.isMine || user?.role === 'Admin'

  const actions = WORKFLOW_ACTIONS.filter(
    (a) => a.role === user?.role && a.from === detail?.status,
  )

  const canFlagAtDesk = detail
    ? (detail.status === 'ForRecommendation' && user?.role === 'Recommender') ||
      (detail.status === 'ForChecking' && user?.role === 'Evaluator') ||
      (detail.status === 'ForApproval' && user?.role === 'Approver')
    : false

  const act = useMutation({
    mutationFn: (payload: {
      action: WorkflowAction
      kind: WorkflowButtonDef['kind']
    }) =>
      updateLoanStatus(id, {
        action: payload.action,
        comments:
          payload.kind === 'return' ||
          payload.action === 'NotRecommend' ||
          payload.action === 'Reject' ||
          payload.action === 'ReturnForRevision'
            ? remarks.trim()
            : remarks.trim() || '',
      }),
    onSuccess: (_d, payload) => {
      toastSuccess(
        payload.action === 'NotRecommend'
          ? 'Evaluation recorded as Not Recommended — forwarded to Approver.'
          : payload.kind === 'return'
            ? 'Application pushed back to the encoder.'
            : 'Application forwarded successfully.',
      )
      setRemarks('')
      qc.invalidateQueries({ queryKey: queryKeys.loans.review.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.loans.review.timeline(id) })
      qc.invalidateQueries({ queryKey: queryKeys.loans.all })
      qc.invalidateQueries({ queryKey: signatureKeys.loan(id) })
    },
    onError: (e: unknown) => {
      const data = (
        e as { response?: { data?: { message?: string; errors?: string[] } } }
      )?.response?.data
      toastError(data?.message ?? getErrorMessage(e))
    },
  })

  const pushBackDocs = useMutation({
    mutationFn: ({ codes, text }: { codes: string[]; text: string }) =>
      flagDocuments(id, { missingRequirementCodes: codes, reason: text }),
    onSuccess: () => {
      toastSuccess(
        'Documents flagged — the encoder has been notified. Review continues.',
      )
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
          ? 'All requirements uploaded — application released to the review queue.'
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

  const canWriteRemarks =
    user?.role === 'Recommender' ||
    user?.role === 'Evaluator' ||
    (user?.role === 'Encoder' && user.userId === String(detail?.createdById)) ||
    user?.role === 'Admin'
  const deviationCount = detail
    ? detail.deviationDetails.length +
      (detail.feeDeviationJustification ? 1 : 0)
    : 0

  const canCancel =
    user?.role === 'Encoder' &&
    Number(user.userId) === detail?.createdById &&
    CANCELLABLE_STATUSES.includes(detail?.status as LoanStatus) &&
    !frozen

  const handleCancel = async () => {
    setCancelPending(true)
    try {
      await cancelLoanApplication(id, cancelReason.trim())
      toastSuccess('Application cancelled.')
      setCancelOpen(false)
      setCancelReason('')
      setCancelPending(false)
      qc.invalidateQueries({ queryKey: queryKeys.loans.review.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.loans.review.timeline(id) })
      qc.invalidateQueries({ queryKey: queryKeys.loans.all })
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not cancel.')
      setCancelPending(false)
    }
  }

  return {
    id,
    navigate,
    loan,
    detail,
    frozen,
    formData,
    checklist,
    signatureSlots,
    deviationsData,
    documentRemarksData,
    groupLoans,
    user,
    remarks,
    setRemarks,
    zoom,
    setZoom,
    tab,
    setTab,
    cancelOpen,
    setCancelOpen,
    cancelReason,
    setCancelReason,
    cancelPending,
    handleCancel,
    flagOpen,
    setFlagOpen,
    needsDeskGate,
    canAct,
    actions,
    canFlagAtDesk,
    canWriteRemarks,
    deviationCount,
    canCancel,
    act,
    pushBackDocs,
    recheck,
    claimById,
    queueState,
  }
}