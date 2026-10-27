import {
  CheckCircle,
  XCircle,
  ArrowCounterClockwise,
  ThumbsDown,
  ThumbsUp,
} from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Button } from '@/src/shared/ui/primitives/button'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { ApplicationTimeline } from '@/src/features/loans/components/application-timeline'

import type { ReviewDraftStatus } from '@/src/features/loans/hooks/use-review-draft'
import {
  deriveWorkflowAction,
  type WorkflowButtonDef,
  type WorkflowAction,
} from './workflow-constants'
import { ConfirmActionDialog } from './confirm-action-dialog'
import {
  LOAN_STATUS_META,
  type LoanStatus,
} from '@/src/features/loans/model/loan-status'

interface WorkflowActionsPanelProps {
  loanId: number | string
  frozen: boolean
  remarks: string
  onRemarksChange: (v: string) => void
  actions: WorkflowButtonDef[]
  needsDeskGate: boolean
  canAct: boolean
  canCancel: boolean
  onCancel: () => void
  onPushback: () => void
  queueState?: {
    isHead: boolean
    ownerName?: string
    position?: number
  }
  act: {
    isPending: boolean
    mutate: (payload: {
      action: WorkflowAction
      kind: WorkflowButtonDef['kind']
    }) => void
  }
  claimById: {
    isPending: boolean
    mutate: (id: string | number) => void
  }
  detailStatus: string

  signatureDataUrl?: string | null
  draftStatus?: ReviewDraftStatus
  draftSavedAt?: number | null
  draftError?: string | null
  onRetryDraftSave?: () => void
}

export function WorkflowActionsPanel({
  loanId,
  frozen,
  remarks,
  onRemarksChange,
  actions,
  needsDeskGate,
  canAct,
  canCancel,
  onCancel,
  onPushback,
  queueState,
  act,
  claimById,
  detailStatus,
  signatureDataUrl,
  draftStatus,
  draftSavedAt,
  draftError,
  onRetryDraftSave,
}: WorkflowActionsPanelProps) {
  const statusMeta = LOAN_STATUS_META[detailStatus as LoanStatus]

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">Decision</CardTitle>
        {frozen && statusMeta && (
          <CardDescription className="pt-1 text-xs">
            {statusMeta.label}: {statusMeta.hint}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {needsDeskGate && !canAct && !frozen && (
          <div className="space-y-2 border bg-muted/30 p-3 text-xs">
            {queueState?.isHead && !queueState.ownerName ? (
              <>
                <p>You are next in the queue.</p>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  onClick={() => claimById.mutate(String(loanId))}
                  disabled={claimById.isPending}
                >
                  {claimById.isPending && (
                    <Spinner className="size-3.5" aria-hidden />
                  )}
                  Claim and review
                </Button>
              </>
            ) : (
              <p>
                {queueState?.ownerName
                  ? `${queueState.ownerName} is reviewing this client. The actions unlock when they finish.`
                  : queueState?.position
                    ? `You are number ${queueState.position} in the queue. Clients are reviewed in order.`
                    : 'Clients are reviewed in order from the Review Desk.'}
              </p>
            )}
          </div>
        )}

        {frozen ? (
          <p className="border border-dashed py-6 text-center text-xs text-muted-foreground">
            No decisions left to make on this application.
          </p>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => {
              const disabled = act.isPending || !canAct
              const icon =
                a.kind === 'reject' ? (
                  <XCircle size={16} aria-hidden />
                ) : a.kind === 'return' ? (
                  <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
                ) : a.verdict === 'NotRecommended' ? (
                  <ThumbsDown size={16} weight="fill" aria-hidden />
                ) : a.verdict === 'Recommended' ? (
                  <ThumbsUp size={16} weight="fill" aria-hidden />
                ) : (
                  <CheckCircle size={16} weight="bold" aria-hidden />
                )

              // A push back collects its sections in its own dialog, so it does
              // not go through the single-action confirm.
              if (a.kind === 'return') {
                return (
                  <Button
                    key={`${a.to}-${a.verdict ?? a.kind}`}
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    disabled={disabled}
                    onClick={onPushback}
                  >
                    {icon} {a.label}
                  </Button>
                )
              }

              if (!a.confirm) {
                return (
                  <Button
                    key={`${a.to}-${a.verdict ?? a.kind}`}
                    type="button"
                    variant={a.kind === 'reject' ? 'destructive' : 'default'}
                    className="w-full gap-2"
                    disabled={disabled}
                    onClick={() =>
                      act.mutate({
                        action: deriveWorkflowAction(a),
                        kind: a.kind,
                      })
                    }
                  >
                    {icon} {a.label}
                  </Button>
                )
              }

              return (
                <ConfirmActionDialog
                  key={`${a.to}-${a.verdict ?? a.kind}`}
                  action={a}
                  remarks={remarks}
                  onRemarksChange={onRemarksChange}
                  isPending={disabled}
                  signatureDataUrl={signatureDataUrl}
                  draftStatus={draftStatus}
                  draftSavedAt={draftSavedAt}
                  draftError={draftError}
                  onRetryDraftSave={onRetryDraftSave}
                  onConfirm={() =>
                    act.mutate({
                      action: deriveWorkflowAction(a),
                      kind: a.kind,
                    })
                  }
                />
              )
            })}

            {actions.length === 0 && (
              <p className="border border-dashed py-6 text-center text-xs text-muted-foreground">
                This stage is not waiting on you.
              </p>
            )}
          </div>
        )}

        {canCancel && !frozen && (
          <div className="border-t pt-4 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-medium text-destructive underline-offset-2 hover:underline"
            >
              Cancel this application
            </button>
          </div>
        )}

        <div className="space-y-3 border-t pt-4">
          <h3 className="text-xs font-semibold text-muted-foreground">
            Activity
          </h3>
          <ApplicationTimeline loanId={loanId} variant="panel" />
        </div>
      </CardContent>
    </Card>
  )
}
