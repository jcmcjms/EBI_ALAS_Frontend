import {
  CheckCircle,
  XCircle,
  ArrowCounterClockwise,
  Clock,
  WarningCircle,
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
import { RichTextEditor } from '@/src/shared/ui/data-display/rich-text-editor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/src/shared/ui/feedback/alert-dialog'
import { ApplicationTimeline } from '@/src/features/loans/components/application-timeline'
import { cn } from '@/src/shared/lib/utils'

import {
  MIN_REMARKS,
  collectRemarksInDialog,
  confirmDescriptionFor,
  deriveWorkflowAction,
  type WorkflowButtonDef,
  type WorkflowAction,
} from './workflow-constants'
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
}

function ConfirmActionDialog({
  action,
  remarks,
  onRemarksChange,
  onConfirm,
  isPending,
}: {
  action: WorkflowButtonDef
  remarks: string
  onRemarksChange: (v: string) => void
  onConfirm: () => void
  isPending: boolean
}) {
  const needsRemarks = collectRemarksInDialog(action)
  const remarksOk = !needsRemarks || remarks.trim().length >= MIN_REMARKS

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            className={cn(
              'w-full gap-2',
              action.verdict === 'NotRecommended' &&
                'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-900',
            )}
            variant={
              action.kind === 'reject'
                ? 'destructive'
                : action.verdict === 'NotRecommended'
                  ? 'outline'
                  : 'default'
            }
            disabled={isPending}
          >
            {action.kind === 'reject' ? (
              <XCircle size={16} />
            ) : action.verdict === 'NotRecommended' ? (
              <ThumbsDown size={16} weight="fill" />
            ) : action.verdict === 'Recommended' ? (
              <ThumbsUp size={16} weight="fill" />
            ) : (
              <CheckCircle size={16} weight="bold" />
            )}
            {action.label}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm: {action.label}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDescriptionFor(action)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {needsRemarks && (
          <div className="space-y-2">
            <RichTextEditor
              value={remarks}
              onChange={onRemarksChange}
              disabled={isPending}
              ariaLabel="Workflow remarks"
              placeholder="Add your comments, conditions, or reasons"
            />
            {remarks.trim().length < MIN_REMARKS && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <WarningCircle size={12} weight="fill" /> Required (min{' '}
                {MIN_REMARKS} chars)
              </p>
            )}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              action.kind === 'reject'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }
            disabled={!remarksOk || isPending}
            onClick={onConfirm}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
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
}: WorkflowActionsPanelProps) {
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle size={18} weight="bold" className="text-primary" />
          Workflow Actions
        </CardTitle>
        <CardDescription className="pt-1 text-xs">
          Review the approval form, then take action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock size={12} /> Remarks
          </h3>
          <ApplicationTimeline loanId={loanId} variant="panel" />
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-2">
          {needsDeskGate &&
            !canAct &&
            (queueState?.isHead && !queueState.ownerName ? (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                <span>You're next in the queue.</span>
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
                Queued #{queueState?.position} — serve files in order from the
                Review Desk.
              </div>
            ))}
          {canCancel && (
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={onCancel}
            >
              <XCircle size={16} /> Cancel Application
            </Button>
          )}
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
                  className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
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
      </CardContent>
    </Card>
  )
}
