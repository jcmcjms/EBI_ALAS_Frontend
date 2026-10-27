import { useEffect, useMemo, useState } from 'react'
import { useReviewDraft } from '@/src/features/loans/hooks/use-review-draft'
import { useParams, useNavigate, useLocation } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keepPreviousData } from '@tanstack/react-query'
import {
  useClaimById,
  useDeskQueue,
} from '@/src/features/loans/hooks/use-desk-queue'
import { resolveQueueState } from '@/src/features/loans/model/desk-queue'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { useEntityViewers } from '@/src/shared/lib/signalr/use-presence'
import { useLoanGroup } from '@/src/features/loans/hooks/use-loan-group'
import {
  useLoanSignatureChain,
  signatureKeys,
} from '@/src/features/loans/api/signatures'
import { useMySignerSignature } from '@/src/features/loans/api/signer-signature'
import {
  getLoanDetail,
  clearDocumentFlag,
  getChecklistDocuments,
  getDocumentRemarks,
  getLoanDeviations,
  approveLoan,
  cancelLoanApplication,
  evaluateLoan,
  recommendLoan,
  rejectLoan,
  flagDocuments,
  pushbackWithRevision,
  CANCELLABLE_STATUSES,
} from '@/src/features/loans/api/loan-review'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'
import { toastError, toastSuccess } from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import type { LoanStatus } from '@/src/features/loans/model/loan-status'
import { mapLoanDetailToFormData } from '@/src/features/loans/model/map-detail-to-form'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import type { CreateRevisionRequestPayload } from '@/src/features/loans/types/revision-request'

import {
  TERMINAL,
  WORKFLOW_ACTIONS,
  type WorkflowButtonDef,
  type WorkflowAction,
} from './workflow-constants'

export function useLoanApprovalPage() {
  const { loanId } = useParams({ strict: false }) as { loanId: string }
  const id = loanId
  const navigate = useNavigate()
  const qc = useQueryClient()
  const hasLoanId = Boolean(id) && id !== 'NaN' && id !== 'undefined'

  const [zoom, setZoom] = useState(1)
  const [tab, setTab] = useState('workflow')
  const [focusDocCode, setFocusDocCode] = useState<string | null>(null)
  const [focusDeviationId, setFocusDeviationId] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => {
    const raw = decodeURIComponent(location.hash?.replace(/^#/, '') ?? '')
    if (!raw) return
    const [tabName, target] = raw.split(':')
    if (tabName === 'deviations' || tabName === 'files' || tabName === 'workflow') {
      setTab(tabName)
    }
    if (!target) {
      setFocusDocCode(null)
      setFocusDeviationId(null)
      return
    }
    if (tabName === 'files') {
      setFocusDocCode(target)
      setFocusDeviationId(null)
    } else if (tabName === 'deviations') {
      setFocusDeviationId(target)
      setFocusDocCode(null)
    }
  }, [location.hash])

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelPending, setCancelPending] = useState(false)

  const [flagOpen, setFlagOpen] = useState(false)
  const [pushbackOpen, setPushbackOpen] = useState(false)

  const user = useAuthStore((s) => s.user)
  useEntityViewers('LoanApplication', hasLoanId ? id : null)

  const loan = useQuery({
    queryKey: loanKeys.review.detail(id),
    queryFn: () => getLoanDetail(id),
    enabled: hasLoanId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })

  
  useEffect(() => {
    if (user?.role === 'Encoder' && loan.data?.status === 'ForRevision') {
      navigate({
        to: '/loans/revision/$loanId',
        params: { loanId: String(id) },
        replace: true,
      })
    }
  }, [user?.role, loan.data?.status, id, navigate])

  // Auto-saved review remarks: server draft with an on-device fallback copy.
  const draft = useReviewDraft({
    loanId: hasLoanId ? id : null,
    enabled: hasLoanId && !!loan.data && !TERMINAL.includes(loan.data.status),
  })
  const remarks = draft.value
  const setRemarks = draft.setValue

  const checklist = useQuery({
    queryKey: loanKeys.review.checklistDocuments(id),
    queryFn: () => getChecklistDocuments(id),
    enabled: hasLoanId,
    staleTime: 30_000,
  })

  const { data: signatureSlots } = useLoanSignatureChain(id)
  const { data: mySignature } = useMySignerSignature()

  const { data: deviationsData } = useQuery({
    queryKey: loanKeys.review.deviations(id),
    queryFn: () => getLoanDeviations(id),
    enabled: hasLoanId,
    staleTime: 30_000,
  })

  const { data: documentRemarksData } = useQuery({
    queryKey: loanKeys.documentRemarks(id),
    queryFn: () => getDocumentRemarks(id),
    enabled: hasLoanId,
    staleTime: 30_000,
  })

  const group = useLoanGroup(loan.data?.applicationGroupNo ?? '')
  const groupLoans = group.data?.loans ?? []

  useEffect(() => {
    setZoom(1)
    setTab('workflow')
    setCancelOpen(false)
    setCancelReason('')
    window.scrollTo({ top: 0 })
  }, [id])

  useEffect(() => {
    for (const sibling of groupLoans) {
      if (String(sibling.id) === String(id)) continue
      void qc.prefetchQuery({
        queryKey: loanKeys.review.detail(sibling.id),
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
  const formData = useMemo(() => {
    if (!detail) return null
    if (detail.form) {
      return detail.form as LoanApplicationFormData
    }
    return mapLoanDetailToFormData(detail)
  }, [detail])

  const claimById = useClaimById()
  const { data: desk } = useDeskQueue()
  const queueState = resolveQueueState(desk, String(id), user?.userId)

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
    }) => {
      switch (payload.action) {
        case 'Recommend':
          return recommendLoan(id, remarks)
        case 'EvaluateRecommend':
          return evaluateLoan(id, true, remarks)
        case 'NotRecommend':
          return evaluateLoan(id, false, remarks)
        case 'Approve':
          return approveLoan(id, remarks)
        case 'Reject':
          return rejectLoan(id, remarks)
        default:
          throw new Error(`Unsupported workflow action: ${payload.action}`)
      }
    },
    onSuccess: (_d, payload) => {
      toastSuccess(
        payload.action === 'NotRecommend'
          ? 'Marked not recommended and sent to the Approver.'
          : payload.kind === 'return'
            ? 'Pushed back to the encoder.'
            : 'Sent to the next reviewer.',
      )
      draft.clear()
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(id) })
      qc.invalidateQueries({ queryKey: loanKeys.review.timeline(id) })
      qc.invalidateQueries({ queryKey: loanKeys.all })
      qc.invalidateQueries({ queryKey: signatureKeys.loan(id) })
    },
    onError: (e: unknown) => {
      toastError(getErrorMessage(e))
    },
  })

  const pushbackMutation = useMutation({
    mutationFn: (payload: CreateRevisionRequestPayload) =>
      pushbackWithRevision(id, payload),
    onSuccess: () => {
      toastSuccess('Pushed back to the encoder.')
      setPushbackOpen(false)
      draft.clear()
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(id) })
      qc.invalidateQueries({ queryKey: loanKeys.review.timeline(id) })
      qc.invalidateQueries({ queryKey: loanKeys.revisionRequests(id) })
      qc.invalidateQueries({ queryKey: loanKeys.all })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })

  const handlePushbackSubmit = (payload: CreateRevisionRequestPayload) => {
    pushbackMutation.mutate(payload)
  }

  const pushBackDocs = useMutation({    mutationFn: ({ codes, text }: { codes: string[]; text: string }) =>
      flagDocuments(id, { missingRequirementCodes: codes, reason: text }),
    onSuccess: () => {
      toastSuccess('Flagged. The encoder has been notified.')
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

  // There is no server-side "verify" endpoint: re-checking means pulling the
  // checklist and the flag again, since uploads happen in WebLoan.
  const recheck = useMutation({
    mutationFn: async () => {
      await Promise.all([
        qc.fetchQuery({
          queryKey: loanKeys.review.checklistDocuments(id),
          queryFn: () => getChecklistDocuments(id),
        }),
        qc.fetchQuery({
          queryKey: loanKeys.review.detail(id),
          queryFn: () => getLoanDetail(id),
        }),
      ])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loanKeys.review.checklistDocuments(id) })
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(id) })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })

  const clearFlag = useMutation({
    mutationFn: () => clearDocumentFlag(id),
    onSuccess: () => {
      toastSuccess('Flag cleared.')
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(id) })
      qc.invalidateQueries({ queryKey: loanKeys.review.timeline(id) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboardRoot })
      qc.invalidateQueries({ queryKey: loanKeys.all })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })

  const documentFlag = detail?.documentFlag ?? null
  const canClearFlag =
    documentFlag !== null &&
    (user?.role === 'Admin' ||
      user?.role === 'Encoder' ||
      String(documentFlag.flaggedById ?? '') === String(user?.userId ?? ''))

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
    String(user.userId) === String(detail?.createdById) &&
    CANCELLABLE_STATUSES.includes(detail?.status as LoanStatus) &&
    !frozen

  const handleCancel = async () => {
    setCancelPending(true)
    try {
      await cancelLoanApplication(id)
      toastSuccess('Application cancelled.')
      setCancelOpen(false)
      setCancelReason('')
      setCancelPending(false)
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(id) })
      qc.invalidateQueries({ queryKey: loanKeys.review.timeline(id) })
      qc.invalidateQueries({ queryKey: loanKeys.all })
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't cancel the application.")
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
    mySignature,
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
    focusDocCode,
    focusDeviationId,
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
    clearFlag,
    canClearFlag,
    documentFlag,
    claimById,
    queueState,
    pushbackOpen,
    setPushbackOpen,
    pushbackMutation,
    handlePushbackSubmit,
    draftStatus: draft.status,
    draftSavedAt: draft.savedAt,
    draftError: draft.errorMessage,
    retryDraftSave: draft.retry,
  }
}