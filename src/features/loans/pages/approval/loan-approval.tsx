import { WarningCircle } from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { IncompleteDocumentsWarning } from '../review/components/incomplete-documents-warning'
import { GroupReviewSection } from '../review/components/group-review-section'
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
    pushbackOpen,
    setPushbackOpen,
    pushbackMutation,
    handlePushbackSubmit,
  } = useLoanApprovalPage()

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <div className="text-center space-y-4">
          <WarningCircle size={48} className="mx-auto text-destructive" />
          <h2 className="text-xl font-semibold">Invalid Application ID</h2>
          <Button onClick={() => navigate({ to: '/loans/monitoring' })}>
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
            {isForbidden ? 'Access Denied' : "Couldn't Load Application"}
          </h2>
          <p className="text-muted-foreground">
            {isForbidden
              ? "You don't have permission to view this loan application. This may be because your account doesn't have the required role, or the application belongs to a different branch. Contact your administrator if you believe this is a mistake."
              : "We couldn't load this loan application. Try again or return to the monitoring page."}
          </p>
          <Button onClick={() => navigate({ to: '/loans/monitoring' })}>
            Return to Monitoring
          </Button>
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
        onNavigate={(path: string) => navigate({ href: path })}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <IncompleteDocumentsWarning
            status={detail.status}
            checklist={checklist.data}
            documentFlag={detail.documentFlag}
          />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr),400px]">
          <ApprovalFormCard
            formData={formData}
            signatureSlots={signatureSlots ?? undefined}
            actions={detail?.actions}
            deviationsData={deviationsData}
            documentRemarksData={documentRemarksData}
            zoom={zoom}
            onZoomChange={setZoom}
          />

          {}
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
                />
              </TabsContent>

              <TabsContent value="deviations" className="pt-4">
                <Card>
                  <CardHeader className="border-b pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <WarningCircle
                        size={18}
                        weight="bold"
                        className="text-amber-600"
                      />
                      Deviations &amp; Remarks
                    </CardTitle>
                    <CardDescription className="pt-1 text-xs">
                      Each deviation carries the encoder&apos;s justification;
                      the recommender and evaluator reply per deviation, and the
                      the encoder can reply to each remark.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <DeviationRemarksPanel
                      loanId={id}
                      canWrite={!!canWriteRemarks}
                      frozen={frozen}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="files" className="pt-4">
                <DocumentsTabContent
                  loanId={id}
                  frozen={frozen}
                  canWriteRemarks={!!canWriteRemarks}
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

            {}
            {detail.applicationGroupNo && (
              <GroupReviewSection
                groupNo={detail.applicationGroupNo}
                currentLoanId={id}
                allowedTargets={actions.map((a) => a.to)}
                statusOf={(s) => s}
                onSelectLoan={(loanId) =>
                  navigate({
                    to: '/loans/approval/$loanId',
                    params: { loanId: String(loanId) },
                  })
                }
              />
            )}
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

      {}
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