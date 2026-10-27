import { useParams, useNavigate } from '@tanstack/react-router'
import {
  ArrowCounterClockwise,
  Clock,
  UserCircle,
  WarningCircle,
  ArrowLeft,
} from '@phosphor-icons/react'

import { Button } from '@/src/shared/ui/primitives/button'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Spinner } from '@/src/shared/ui/feedback/spinner'

import { FlagIncompleteDocumentsDialog } from '../approval/components/flag-incomplete-documents-dialog'
import { IncompleteDocumentsWarning } from '../review/components/incomplete-documents-warning'
import { PushbackDialog } from '../../components/pushback-dialog'
import { EvaluationActionsPanel } from './evaluation-actions-panel'
import { ApprovalFormCard } from './approval-form-card'
import { useEvaluationPage } from './use-evaluation-page'
import {
  LOAN_STATUS_META,
  type LoanStatus,
} from '@/src/features/loans/model/loan-status'
import { cn } from '@/src/shared/lib/utils'
import { countNoun } from '@/src/shared/lib/format'

export function LoanEvaluationPage() {
  const { loanId } = useParams({ strict: false }) as { loanId: string }
  const id = loanId
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
    signatureSlots,
    mySignature,
    detail,
    formData,
    loanClass,
    recheck,
    flagDocs,
    handleAction,
    pushbackOpen,
    setPushbackOpen,
    pushbackMutation,
    handlePushbackSubmit,
    showEvaluatorActions,
    commentsRequired,
    canAct,
    updateStatus,
    draftStatus,
    draftSavedAt,
    draftError,
    retryDraftSave,
  } = useEvaluationPage(id)

  if (!id || id === 'NaN' || id === 'undefined') {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <div className="text-center space-y-4">
          <WarningCircle size={48} className="mx-auto text-destructive" />
          <h2 className="text-xl font-semibold">Invalid Application ID</h2>
          <Button onClick={() => navigate({ to: '/loans/monitoring' })}>
            Go to Loan Monitoring
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
            {isForbidden ? 'Access denied' : "Couldn't load the application"}
          </h2>
          <p className="text-muted-foreground">
            {isForbidden
              ? "You don't have permission to view this application. It may belong to another branch, or your role may not allow it. Ask an administrator if you think that's wrong."
              : "Couldn't load this application. Try again or go back to Loan Monitoring."}
          </p>
          <Button onClick={() => navigate({ to: '/loans/monitoring' })}>
            Go to Loan Monitoring
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
              onClick={() => navigate({ to: '/loans/monitoring' })}
              aria-label="Back to monitoring"
            >
              <ArrowLeft size={18} weight="bold" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate({ to: '/loans/queue' })}
            >
              Review Desk
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">
              Loan Evaluation
            </h1>
            <Badge variant="outline" className="text-xs">
              {detail.lamId}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5',
                LOAN_STATUS_META[detail.status as LoanStatus]?.className,
              )}
            >
              <Clock size={12} weight="fill" />
              {LOAN_STATUS_META[detail.status as LoanStatus]?.label ??
                detail.status}
            </Badge>
            {deviationCount > 0 && (
              <Badge
                variant="outline"
                className="gap-1.5 border-warning-border bg-warning-surface text-warning"
              >
                <WarningCircle size={12} weight="fill" aria-hidden />
                {countNoun(deviationCount, 'deviation')}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="gap-1.5 font-normal">
            <UserCircle size={14} />
            {detail.createdByName}
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
            >
              {recheck.isPending ? (
                <Spinner className="size-3.5" aria-hidden />
              ) : (
                <ArrowCounterClockwise size={14} weight="bold" aria-hidden />
              )}
              Refresh
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr),400px]">
          <div className="space-y-4">
            <ApprovalFormCard
              formData={formData}
              catLoanClass={loanClass.data?.catLoanClass ?? null}
              lamId={detail.lamId}
              signatureSlots={signatureSlots ?? undefined}
            />
          </div>

          <EvaluationActionsPanel
            loanId={id}
            comments={comments}
            onCommentsChange={setComments}
            draftStatus={draftStatus}
            draftSavedAt={draftSavedAt}
            draftError={draftError}
            onRetryDraftSave={retryDraftSave}
            frozen={frozen}
            showEvaluatorActions={showEvaluatorActions}
            commentsRequired={commentsRequired}
            canAct={canAct}
            pendingAction={pendingAction}
            isPending={updateStatus.isPending}
            signatureDataUrl={mySignature}
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

      <PushbackDialog
        open={pushbackOpen}
        onOpenChange={setPushbackOpen}
        onSubmit={handlePushbackSubmit}
        isPending={pushbackMutation.isPending}
      />
    </div>
  )
}