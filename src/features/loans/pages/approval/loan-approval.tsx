import { WarningCircle } from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/src/shared/ui/navigation/tabs'
import { Spinner } from '@/src/shared/ui/feedback/spinner'

import { DeviationRemarksPanel } from './components/deviation-remarks-panel'
import { IncompleteDocumentsAlert } from './components/incomplete-documents-alert'
import { FlagIncompleteDocumentsDialog } from './components/flag-incomplete-documents-dialog'
import { PushbackDialog } from '@/src/features/loans/components/pushback-dialog'
import { useLoanApprovalPage } from './use-loan-approval-page'
import { ApprovalPageHeader } from './approval-page-header'
import { WorkflowActionsPanel } from './workflow-actions-panel'
import { CancelApplicationDialog } from './cancel-application-dialog'
import { DocumentsTabContent } from './documents-tab-content'
import { ApprovalFormCard } from './approval-form-card'

export function LoanApprovalPage() {
  const {
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
    draftStatus,
    draftSavedAt,
    draftError,
    retryDraftSave,
  } = useLoanApprovalPage()

  if (!id || id === 'NaN' || id === 'undefined') {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center px-6">
        <div className="max-w-sm space-y-3 text-center">
          <h2 className="text-lg font-semibold text-balance">
            That application link is incomplete
          </h2>
          <p className="text-xs text-muted-foreground text-pretty">
            Open the application from the Review Desk or Loan Monitoring
            instead.
          </p>
          <Button
            type="button"
            className="mx-auto"
            onClick={() => navigate({ to: '/loans/monitoring' })}
          >
            Go to Loan Monitoring
          </Button>
        </div>
      </div>
    )
  }

  if (loan.isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading the application"
        className="flex h-[calc(100vh-var(--header-height))] items-center justify-center"
      >
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
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center px-6">
        <div className="max-w-sm space-y-3 text-center">
          <h2 className="text-lg font-semibold text-balance">
            {isForbidden
              ? 'You cannot open this application'
              : 'This application did not load'}
          </h2>
          <p className="text-xs text-muted-foreground text-pretty">
            {isForbidden
              ? 'It belongs to another branch, or your role does not cover this stage.'
              : 'The server did not return it. Try again in a moment.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!isForbidden && (
              <Button type="button" onClick={() => loan.refetch()}>
                Try again
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/loans/monitoring' })}
            >
              Go to Loan Monitoring
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40">
      <ApprovalPageHeader
        detail={detail}
        id={id}
        deviationCount={deviationCount}
        frozen={frozen}
        canFlagAtDesk={canFlagAtDesk}
        onFlag={() => setFlagOpen(true)}
        groupLoans={groupLoans}
        onNavigate={(path: string) => {
          if (path === '/loans/queue') {
            navigate({ to: '/loans/queue' })
            return
          }
          if (path === '/loans/monitoring') {
            navigate({ to: '/loans/monitoring' })
            return
          }
          const match = path.match(/^\/loans\/approval\/([^/?#]+)/)
          if (match?.[1]) {
            navigate({
              to: '/loans/approval/$loanId',
              params: { loanId: match[1] },
            })
            return
          }
          navigate({ to: '/loans/monitoring' })
        }}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <IncompleteDocumentsAlert
            count={
              checklist.data?.filter(
                (d) =>
                  d.uploadStatus !== 'Uploaded' &&
                  d.uploadStatus !== 'Submitted',
              )
                .length ?? 0
            }
            missingNames={
              checklist.data
                ?.filter(
                  (d) =>
                    d.uploadStatus !== 'Uploaded' &&
                    d.uploadStatus !== 'Submitted',
                )
                .map((d) => d.checklistDescription?.trim() || d.idCode) ?? []
            }
            flag={documentFlag}
            canClearFlag={canClearFlag}
            isClearing={clearFlag.isPending}
            onClearFlag={() => clearFlag.mutate()}
            onReview={() => {
              setTab('files')
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  document
                    .getElementById('document-requirements')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                })
              })
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <ApprovalFormCard
            formData={formData}
            loanId={id}
            lamId={detail.lamId}
            signatureSlots={signatureSlots ?? undefined}
            actions={detail?.actions}
            deviationsData={deviationsData}
            documentRemarksData={documentRemarksData}
            zoom={zoom}
            onZoomChange={setZoom}
          />

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit lg:self-start">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full">
                <TabsTrigger value="workflow" className="flex-1">
                  Workflow
                </TabsTrigger>
                <TabsTrigger value="deviations" className="flex-1">
                  Deviations
                  {deviationCount > 0 ? ` (${deviationCount})` : ''}
                </TabsTrigger>
                <TabsTrigger value="files" className="flex-1">
                  Files
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workflow" className="pt-4">
                <WorkflowActionsPanel
                  loanId={id}
                  frozen={frozen}
                  remarks={remarks}
                  onRemarksChange={setRemarks}
                  actions={actions}
                  needsDeskGate={needsDeskGate}
                  canAct={canAct}
                  canCancel={canCancel}
                  onCancel={() => setCancelOpen(true)}
                  onPushback={() => setPushbackOpen(true)}
                  queueState={queueState}
                  act={act}
                  claimById={claimById}
                  detailStatus={detail.status}
                  signatureDataUrl={mySignature}
                  draftStatus={draftStatus}
                  draftSavedAt={draftSavedAt}
                  draftError={draftError}
                  onRetryDraftSave={retryDraftSave}
                />
              </TabsContent>

              <TabsContent value="deviations" className="pt-4">
                <Card>
                  <CardHeader className="border-b pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <WarningCircle
                        size={18}
                        weight="bold"
                        className="text-warning"
                      />
                      Deviations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <DeviationRemarksPanel
                      loanId={id}
                      canWrite={!!canWriteRemarks}
                      frozen={frozen}
                      focusDeviationId={focusDeviationId}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="files" className="pt-4">
                <DocumentsTabContent
                  loanId={id}
                  frozen={frozen}
                  canWriteRemarks={!!canWriteRemarks}
                  focusDocCode={focusDocCode}
                  canPushBack={
                    (user?.role === 'Evaluator' &&
                      detail.status === 'ForChecking') ||
                    (user?.role === 'Recommender' &&
                      detail.status === 'ForRecommendation') ||
                    (user?.role === 'Approver' &&
                      detail.status === 'ForApproval') ||
                    user?.role === 'Admin'
                  }
                  pushBackPending={pushBackDocs.isPending}
                  onPushBack={(codes, text) =>
                    pushBackDocs.mutate({ codes, text })
                  }
                  recheckPending={recheck.isPending}
                  onRecheck={() => recheck.mutate()}
                />
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </div>

      <CancelApplicationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        cancelReason={cancelReason}
        onCancelReasonChange={setCancelReason}
        cancelPending={cancelPending}
        onCancel={handleCancel}
        firstName={detail.firstName}
        lastName={detail.lastName}
        lamId={detail.lamId}
      />

      <FlagIncompleteDocumentsDialog
        open={flagOpen}
        onOpenChange={setFlagOpen}
        items={checklist.data ?? []}
        isSubmitting={pushBackDocs.isPending}
        onSubmit={({ missingRequirementCodes, comments }) =>
          pushBackDocs.mutate(
            { codes: missingRequirementCodes, text: comments },
            { onSuccess: () => setFlagOpen(false) },
          )
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
