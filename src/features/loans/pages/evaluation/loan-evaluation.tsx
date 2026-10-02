import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowCounterClockwise,
  Clock,
  UserCircle,
  WarningCircle,
  ArrowLeft,
} from '@phosphor-icons/react'

import { Button } from '@/src/shared/ui/button'
import { Badge } from '@/src/shared/ui/badge'
import { Spinner } from '@/src/shared/ui/spinner'

import { FlagIncompleteDocumentsDialog } from '../approval/components/flag-incomplete-documents-dialog'
import { IncompleteDocumentsWarning } from '../review/components/incomplete-documents-warning'
import { EvaluationActionsPanel } from './evaluation-actions-panel'
import { ApprovalFormCard } from './approval-form-card'
import { useEvaluationPage } from './use-evaluation-page'

export function LoanEvaluationPage() {
  const { loanId } = useParams<{ loanId: string }>()
  const id = Number(loanId)
  const navigate = useNavigate()

  const {
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
    recheck,
    flagDocs,
    handleAction,
    showEvaluatorActions,
    commentsRequired,
    canAct,
    updateStatus,
  } = useEvaluationPage(id)

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

  const hasDocumentFlag = detail.documentFlag != null
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
            <ApprovalFormCard
              formData={formData}
              catLoanClass={loanClass.data?.catLoanClass ?? null}
              signatureSlots={signatureSlots ?? undefined}
            />
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