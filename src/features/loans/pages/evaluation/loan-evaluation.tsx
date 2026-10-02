import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowCounterClockwise,
  FilePdf,
  Printer,
  Clock,
  UserCircle,
  WarningCircle,
  ArrowLeft,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from '@phosphor-icons/react'
import { toastSuccess, toastError } from '@/src/shared/ui/toast'
import axios from 'axios'
import { getErrorMessage } from '@/src/shared/lib/apiClient'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/card'
import { Button } from '@/src/shared/ui/button'
import { Badge } from '@/src/shared/ui/badge'
import { Spinner } from '@/src/shared/ui/spinner'

import { useAuthStore } from '@/src/features/auth/store/authStore'
import { useEntityViewers } from '@/src/shared/lib/signalr/use-presence'
import { ApprovalFormDocument } from '../approval/components/approval-form-document'
import { ApprovalFormViewport } from '@/src/features/loans/components/approval-form-sheet'
import { useCatLoanClass } from '@/src/features/loans/hooks/use-cat-loan-class'
import { parseProductCode } from '@/src/features/loans/utils/loan-product-display'
import {
  getLoanDetail,
  getLoanHistory,
  updateLoanStatus,
  flagDocuments,
} from '@/src/features/loans/api/loan-review'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'
import {
  useLoanSignatureChain,
  signatureKeys,
} from '@/src/features/loans/api/signatures'
import { mapLoanDetailToFormData } from '@/src/features/loans/utils/map-detail-to-form'
import { FlagIncompleteDocumentsDialog } from '../approval/components/flag-incomplete-documents-dialog'
import { IncompleteDocumentsWarning } from '../review/components/incomplete-documents-warning'
import { getChecklistDocuments } from '@/src/features/loans/api/loan-review'
import type { LoanStatus } from '@/src/features/loans/utils/loan-status'
import { apiClient } from '@/src/shared/lib/apiClient'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'
import { EvaluationActionsPanel } from './evaluation-actions-panel'

type EvaluationAction = 'recommended' | 'notRecommended' | 'pushback'

const TERMINAL = ['Approved', 'Rejected', 'Disbursed', 'OnGoing']

export function LoanEvaluationPage() {
  const { loanId } = useParams<{ loanId: string }>()
  const id = Number(loanId)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [comments, setComments] = useState('')
  const [pendingAction, setPendingAction] = useState<EvaluationAction | null>(
    null,
  )
  const [zoom, setZoom] = useState(1)
  const [flagOpen, setFlagOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
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

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <div className="text-center space-y-4">
          <WarningCircle size={48} className="mx-auto text-destructive" />
          <h2 className="text-xl font-semibold">Invalid Application ID</h2>
          <Button onClick={() => navigate('/loans/monitoring')}>
            Return to Monitoring
          </Button>
        </div>
      </div>
    )
  }

  if (loan.isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (loan.isError || !detail || !formData) {
    const isForbidden =
      loan.error &&
      typeof loan.error === 'object' &&
      'response' in loan.error &&
      (loan.error as { response?: { status?: number } }).response?.status ===
        403

    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <WarningCircle size={48} className="mx-auto text-destructive" />
          <h2 className="text-xl font-semibold">
            {isForbidden ? 'Access Denied' : 'Failed to Load Application'}
          </h2>
          <p className="text-muted-foreground">
            {isForbidden
              ? "You don't have permission to view this loan application. This may be because your account doesn't have the required role, or the application belongs to a different branch. Please contact your administrator if you believe this is a mistake."
              : "We couldn't load this loan application. Please try again or return to the monitoring page."}
          </p>
          <Button onClick={() => navigate('/loans/monitoring')}>
            Return to Monitoring
          </Button>
        </div>
      </div>
    )
  }

  const isEvaluator = user?.role === 'Evaluator'
  const isForChecking = detail.status === 'ForChecking'
  const showEvaluatorActions = isEvaluator && isForChecking && !frozen

  const hasDocumentFlag = detail.documentFlag != null

  const commentsRequired =
    pendingAction === 'pushback' || pendingAction === 'notRecommended'
  const canAct =
    (!commentsRequired || comments.trim().length >= 10) &&
    !updateStatus.isPending

  const deviationCount =
    detail.deviationDetails.length + (detail.feeDeviationJustification ? 1 : 0)

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40">
      <header className="sticky top-[var(--header-height)] z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 flex-wrap items-center justify-between gap-3 px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('/loans/monitoring')}
              aria-label="Back to monitoring"
            >
              <ArrowLeft size={18} weight="bold" />
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">
              Loan Evaluation
            </h1>
            <Badge variant="outline" className="text-xs">
              {detail.lamId}
            </Badge>
            <Badge
              variant="secondary"
              className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700"
            >
              <Clock size={12} weight="fill" />
              {detail.status}
            </Badge>
            {detail.hasDeviations && (
              <Badge
                variant="secondary"
                className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700"
              >
                <WarningCircle size={12} weight="fill" /> {deviationCount}{' '}
                deviation
                {deviationCount === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="gap-1.5 font-normal">
            <UserCircle size={14} />
            {detail.createdByName} (Encoder)
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-start gap-3">
          <IncompleteDocumentsWarning
            status={detail.status}
            checklist={checklist.data}
            documentFlag={detail.documentFlag}
          />
          {hasDocumentFlag && !frozen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => recheck.mutate()}
              disabled={recheck.isPending}
              title="Re-verify document completeness"
            >
              <ArrowCounterClockwise size={14} weight="bold" />
              Re-check documents
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr),400px]">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 p-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FilePdf size={20} weight="bold" className="text-primary" />
                  Approval Form Document
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Zoom out"
                    onClick={() =>
                      setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))
                    }
                  >
                    <MagnifyingGlassMinus size={15} />
                  </Button>
                  <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Zoom in"
                    onClick={() =>
                      setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))
                    }
                  >
                    <MagnifyingGlassPlus size={15} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2 gap-1.5"
                    onClick={() => window.print()}
                  >
                    <Printer size={14} weight="bold" /> Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ApprovalFormViewport zoom={zoom}>
                  <ApprovalFormDocument
                    data={formData}
                    catLoanClass={loanClass.data?.catLoanClass ?? null}
                    signatureSlots={signatureSlots ?? undefined}
                  />
                </ApprovalFormViewport>
              </CardContent>
            </Card>
          </div>

          <EvaluationActionsPanel
            history={history.data ?? []}
            historyLoading={history.isLoading}
            comments={comments}
            onCommentsChange={setComments}
            frozen={frozen}
            showEvaluatorActions={showEvaluatorActions}
            commentsRequired={commentsRequired}
            canAct={canAct}
            pendingAction={pendingAction}
            isPending={updateStatus.isPending}
            onAction={handleAction}
            onFlagOpen={() => setFlagOpen(true)}
            status={detail.status}
          />
        </div>
      </div>

      <FlagIncompleteDocumentsDialog
        open={flagOpen}
        onOpenChange={setFlagOpen}
        items={checklist.data ?? []}
        isSubmitting={flagDocs.isPending}
        onSubmit={({ missingRequirementCodes, comments: flagComments }) =>
          flagDocs.mutate({
            codes: missingRequirementCodes,
            reason: flagComments,
          })
        }
      />
    </div>
  )
}