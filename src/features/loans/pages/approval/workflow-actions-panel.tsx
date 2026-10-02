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
} from '@/src/shared/ui/card'
import { Button } from '@/src/shared/ui/button'
import { RichTextEditor } from '@/src/shared/ui/rich-text-editor'
import { RichText } from '@/src/shared/ui/rich-text'
import { Label } from '@/src/shared/ui/label'
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
} from '@/src/shared/ui/alert-dialog'
import { ApplicationTimeline } from '@/src/features/loans/components/application-timeline'
import { cn } from '@/src/shared/lib/utils'

import {
  MIN_REMARKS,
  deriveWorkflowAction,
  type WorkflowButtonDef,
  type WorkflowAction,
} from './workflow-constants'

interface WorkflowActionsPanelProps {
  loanId: number
  frozen: boolean
  remarks: string
  onRemarksChange: (v: string) => void
  actions: WorkflowButtonDef[]
  needsDeskGate: boolean
  canAct: boolean
  canCancel: boolean
  onCancel: () => void
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
    mutate: (id: number) => void
  }
  detailStatus: string
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
  queueState,
  act,
  claimById,
  detailStatus,
}: WorkflowActionsPanelProps) {
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle
            size={18}
            weight="bold"
            className="text-primary"
          />
          Workflow Actions
        </CardTitle>
        <CardDescription className="pt-1 text-xs">
          Review the approval form, then take action. Add your
          remarks below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {}
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock size={12} /> Remarks
          </h3>
          <ApplicationTimeline loanId={loanId} variant="panel" />
        </div>

        <div className="h-px bg-border" />

        {}
        <div className="space-y-2">
          <Label
            htmlFor="remarks"
            className="flex items-center gap-1.5 text-sm font-semibold"
          >
            Remarks / Conditions
            {actions.some((a) => a.remarksRequired) && (
              <span className="text-destructive">*</span>
            )}
          </Label>
          <RichTextEditor
            value={remarks}
            onChange={onRemarksChange}
            disabled={frozen || act.isPending}
            ariaLabel="Workflow remarks"
            placeholder="Add your comments, conditions, or reasons\u2026"
          />
          {remarks.trim().length < MIN_REMARKS && !frozen && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <WarningCircle size={12} weight="fill" /> Required
              (min {MIN_REMARKS} chars) for pushback, rejection, and
              a Not Recommended evaluation.
            </p>
          )}
        </div>

        {}
        <div className="space-y-2">
          {needsDeskGate &&
            !canAct &&
            (queueState?.isHead && !queueState.ownerName ? (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                <span>You're next in the queue.</span>
                <Button
                  onClick={() => claimById.mutate(loanId)}
                  disabled={claimById.isPending}
                  className="gap-2"
                >
                  Claim &amp; review
                </Button>
              </div>
            ) : queueState?.ownerName ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                Currently with {queueState.ownerName}. You have
                view-only access until the current review is finished.
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                Queued #{queueState?.position} — serve files in
                order from the Review Desk.
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
              This application is <strong>{detailStatus}</strong> —
              no further actions.
            </p>
          )}
          {actions.map((a) => {
            const blocked =
              act.isPending ||
              (a.remarksRequired &&
                remarks.trim().length < MIN_REMARKS) ||
              !canAct
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

            const button = (
              <Button
                key={`${a.to}-${a.verdict ?? a.kind}`}
                className={cn(
                  'w-full gap-2',
                  a.verdict === 'NotRecommended' &&
                    'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-900',
                  a.kind === 'return' &&
                    'border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive',
                )}
                variant={
                  a.kind === 'reject'
                    ? 'destructive'
                    : a.kind === 'return' ||
                        a.verdict === 'NotRecommended'
                      ? 'outline'
                      : 'default'
                }
                disabled={blocked}
                onClick={() =>
                  !a.confirm &&
                  act.mutate({
                    action: deriveWorkflowAction(a),
                    kind: a.kind,
                  })
                }
              >
                {icon} {a.label}
              </Button>
            )

            if (!a.confirm)
              return (
                <div key={`${a.to}-${a.verdict ?? a.kind}`}>
                  {button}
                </div>
              )

            return (
              <AlertDialog key={`${a.to}-${a.verdict ?? a.kind}`}>
                <AlertDialogTrigger render={button} />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Confirm: {a.label}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {a.kind === 'return'
                        ? 'The application returns to the ENCODER (not the recommender) for revision. They will be notified with your remarks.'
                        : a.verdict === 'NotRecommended'
                          ? 'The application still proceeds to the Approver, flagged as NOT RECOMMENDED with your remarks attached.'
                          : 'This will reject the loan and close the application. The encoder will be notified.'}
                      {remarks.trim() && (
                        <span className="mt-2 block border-l-2 border-border pl-2 italic">
                          <RichText
                            value={remarks}
                            emptyFallback={null}
                          />
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className={
                        a.kind === 'return' || a.kind === 'reject'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-amber-600 text-white hover:bg-amber-700'
                      }
                      onClick={() =>
                        act.mutate({
                          action: deriveWorkflowAction(a),
                          kind: a.kind,
                        })
                      }
                    >
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}