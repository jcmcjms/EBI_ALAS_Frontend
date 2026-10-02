import { CheckCircle, ArrowRight, ArrowCounterClockwise, Clock, ThumbsDown, ThumbsUp, WarningCircle } from '@phosphor-icons/react'
import { RichText } from '@/src/shared/ui/rich-text'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/shared/ui/card'
import { Button } from '@/src/shared/ui/button'
import { Textarea } from '@/src/shared/ui/textarea'
import { Label } from '@/src/shared/ui/label'
import { Spinner } from '@/src/shared/ui/spinner'
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

type EvaluationAction = 'recommended' | 'notRecommended' | 'pushback'

interface HistoryEntry {
  id: number
  actionBy: string
  action: string
  toStatus: string | null
  comments: string | null
  actionDate: string
}

interface EvaluationActionsPanelProps {
  history: HistoryEntry[]
  historyLoading: boolean
  comments: string
  onCommentsChange: (value: string) => void
  frozen: boolean
  showEvaluatorActions: boolean
  commentsRequired: boolean
  canAct: boolean
  pendingAction: EvaluationAction | null
  isPending: boolean
  onAction: (action: EvaluationAction) => void
  onFlagOpen: () => void
  status: string
}

export function EvaluationActionsPanel({
  history,
  historyLoading,
  comments,
  onCommentsChange,
  frozen,
  showEvaluatorActions,
  commentsRequired,
  canAct,
  pendingAction,
  isPending,
  onAction,
  onFlagOpen,
  status,
}: EvaluationActionsPanelProps) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit lg:self-start">
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle
              size={18}
              weight="bold"
              className="text-primary"
            />
            Evaluation Actions
          </CardTitle>
          <CardDescription className="pt-1 text-xs">
            Review the application and provide your evaluation
            recommendation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock size={12} /> History
            </h3>
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <Spinner className="size-5" />
              </div>
            ) : (
              <ul className="space-y-3 text-xs">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-3">
                    {h.toStatus === 'Rejected' ? (
                      <WarningCircle
                        size={16}
                        weight="fill"
                        className="mt-0.5 shrink-0 text-destructive"
                      />
                    ) : h.toStatus === 'ForRevision' ? (
                      <ArrowCounterClockwise
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-amber-500"
                      />
                    ) : (
                      <ArrowRight
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-blue-500"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{h.actionBy}</p>
                      <p className="text-muted-foreground">
                        {h.action}
                        {h.toStatus ? ` → ${h.toStatus}` : ''} &bull;{' '}
                        {new Date(h.actionDate).toLocaleString()}
                      </p>
                      {h.comments && (
                        <div className="mt-1 border-l-2 border-border pl-2 italic text-muted-foreground">
                          <RichText
                            value={h.comments}
                            emptyFallback={null}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-2">
            <Label
              htmlFor="eval-comments"
              className="flex items-center gap-1.5 text-sm font-semibold"
            >
              Remarks / Evaluation Notes
              {commentsRequired && (
                <span className="text-destructive">*</span>
              )}
            </Label>
            <Textarea
              id="eval-comments"
              rows={5}
              disabled={frozen || isPending}
              placeholder="Provide your evaluation, findings, or conditions for approval…"
              value={comments}
              onChange={(e) => onCommentsChange(e.target.value)}
              maxLength={2000}
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              {commentsRequired && comments.trim().length < 10 && (
                <p className="flex items-center gap-1">
                  <WarningCircle size={12} weight="fill" /> Required for
                  this action (min 10 characters)
                </p>
              )}
              <span className="ml-auto">{comments.length}/2000</span>
            </div>
          </div>

          <div className="space-y-2">
            {frozen && (
              <p className="rounded-md bg-muted p-3 text-center text-xs text-muted-foreground">
                This application is <strong>{status}</strong> — no
                further actions.
              </p>
            )}

            {showEvaluatorActions ? (
              <>
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => onAction('recommended')}
                  disabled={!canAct || pendingAction !== null}
                >
                  {isPending && pendingAction === 'recommended' ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      <ThumbsUp size={18} weight="bold" />
                      Recommended for Approval
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => onAction('notRecommended')}
                  disabled={!canAct || pendingAction !== null}
                >
                  {isPending && pendingAction === 'notRecommended' ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      <ThumbsDown size={16} />
                      Not Recommended
                    </>
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="destructive"
                        className="w-full gap-2"
                        disabled={!canAct || pendingAction !== null}
                      />
                    }
                  >
                    <ArrowCounterClockwise size={16} />
                    Push Back to Encoder
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Push back this application?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This returns the application to the encoder for
                        revision. The encoder will be notified with your
                        evaluation comments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        disabled={isPending}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onAction('pushback')}
                        disabled={isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Confirm Pushback
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button
                  variant="outline"
                  className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  disabled={!canAct || pendingAction !== null}
                  onClick={onFlagOpen}
                >
                  <WarningCircle size={16} />
                  Flag Incomplete Documents
                </Button>
              </>
            ) : (
              !frozen && (
                <div className="rounded-md bg-muted p-4 text-center text-xs text-muted-foreground">
                  No actions available for your role on this application
                  status.
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}