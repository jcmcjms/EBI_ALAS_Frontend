import {
  CheckCircle,
  XCircle,
  ArrowCounterClockwise,
  Clock,
  ThumbsDown,
  ThumbsUp,
} from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/shared/ui/data-display/card'
import { Button } from '@/src/shared/ui/primitives/button'
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

  missingDocCount?: number
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
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle size={18} weight="bold" className="text-primary" />
          Decision Actions
        </CardTitle>
        <CardDescription className="pt-1 text-xs">
          {frozen ? 'This application is locked.' : 'Select a decision to proceed.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {needsDeskGate &&
          !canAct &&
          (queueState?.isHead && !queueState.ownerName ? (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm">
              <span>You&apos;re next in the queue.</span>
              <Button
                onClick={() => claimById.mutate(String(loanId))}
                disabled={claimById.isPending}
                className="gap-2"
              >
                Claim &amp; review
              </Button>
            </div>
          ) : queueState?.ownerName ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              Currently with {queueState.ownerName}. You have view-only
              access until the current review is finished.
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              This client is queued #{queueState?.position ?? '—'} — serve
              clients in order from the Review Desk.
            </div>
          ))}

        {frozen && (
          <p className="rounded-md bg-muted p-3 text-center text-xs text-muted-foreground">
            This application is{' '}
            <strong>
              {LOAN_STATUS_META[detailStatus as LoanStatus]?.label ??
                detailStatus}
            </strong>{' '}
            — no further actions.
          </p>
        )}

        <div className="space-y-2">
          {actions.map((a) => {
            const disabled = act.isPending || !canAct
            const icon =
              a.kind === 'reject' ? (
                <XCircle size={16} />
              ) : a.kind === 'return' ? (
                <ArrowCounterClockwise size={16} />
              ) : a.verdict === 'NotRecommended' ? (
                <ThumbsDown size={16} weight="fill" />
              ) : a.verdict === 'Recommended' ? (
                <ThumbsUp size={16} weight="fill" />
              ) : (
                <CheckCircle size={16} weight="bold" />
              )

            if (a.kind === 'return') {
              return (
                <Button
                  key={`${a.to}-${a.verdict ?? a.kind}`}
                  className="w-full gap-2 border-amber-500/50 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400"
                  variant="outline"
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
        </div>

        {canCancel && !frozen && (
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="mx-auto flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
            >
              <XCircle size={12} weight="bold" /> Cancel this application
            </button>
          </div>
        )}

        <div className="space-y-3 border-t pt-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock size={12} /> Activity Timeline
          </h3>
          <ApplicationTimeline loanId={loanId} variant="panel" />
        </div>
      </CardContent>
    </Card>
  )
}
