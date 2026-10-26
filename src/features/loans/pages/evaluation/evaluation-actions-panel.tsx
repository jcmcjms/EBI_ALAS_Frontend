import { CheckCircle, ArrowRight, ArrowCounterClockwise, Clock, ThumbsDown, ThumbsUp, WarningCircle } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { RichText } from '@/src/shared/ui/data-display/rich-text'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/shared/ui/data-display/card'
import { Button } from '@/src/shared/ui/primitives/button'
import { Textarea } from '@/src/shared/ui/primitives/textarea'
import { Label } from '@/src/shared/ui/primitives/label'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { DraftSaveIndicator } from '@/src/features/loans/components/draft-save-indicator'
import type { ReviewDraftStatus } from '@/src/features/loans/hooks/use-review-draft'

type EvaluationAction = 'recommended' | 'notRecommended' | 'pushback'

interface HistoryEntry {
  id: number | string
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
  signatureDataUrl?: string | null
  draftStatus?: ReviewDraftStatus
  draftSavedAt?: number | null
  draftError?: string | null
  onRetryDraftSave?: () => void
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
  signatureDataUrl,
  draftStatus,
  draftSavedAt,
  draftError,
  onRetryDraftSave,
}: EvaluationActionsPanelProps) {
  const hasSignature = Boolean(signatureDataUrl)
  const signedActionBlocked = showEvaluatorActions && !hasSignature
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
              Remarks
              {commentsRequired && (
                <span className="text-destructive">*</span>
              )}
            </Label>
            <Textarea
              id="eval-comments"
              rows={5}
              disabled={frozen || isPending}
              placeholder="Your findings, and any conditions for approval…"
              value={comments}
              onChange={(e) => onCommentsChange(e.target.value)}
              maxLength={2000}
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              {commentsRequired && comments.trim().length < 10 && (
                <p className="flex items-center gap-1">
                  <WarningCircle size={12} weight="fill" /> At least 10
                  characters required for this action
                </p>
              )}
              <span className="ml-auto">{comments.length}/2000</span>
            </div>
            {draftStatus && !frozen && (
              <DraftSaveIndicator
                status={draftStatus}
                savedAt={draftSavedAt ?? null}
                errorMessage={draftError}
                onRetry={onRetryDraftSave}
              />
            )}
          </div>

          <div className="space-y-2">
            {signedActionBlocked && (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="flex items-center gap-1 font-medium">
                  <WarningCircle size={12} weight="fill" />
                  You need an e-signature on file to evaluate.
                </p>
                <Link
                  to="/account"
                  className="font-semibold underline underline-offset-2"
                >
                  Add your signature
                </Link>
              </div>
            )}

            {showEvaluatorActions && hasSignature && (
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">
                  Your e-signature on file
                </p>
                <img
                  src={signatureDataUrl!}
                  alt="Your saved e-signature"
                  className="mt-1 h-12 w-full object-contain object-left"
                />
              </div>
            )}

            {frozen && (
              <p className="rounded-md bg-muted p-3 text-center text-xs text-muted-foreground">
                This application is <strong>{status}</strong>. No
                actions available.
              </p>
            )}

            {showEvaluatorActions ? (
              <>
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => onAction('recommended')}
                  disabled={!canAct || pendingAction !== null || !hasSignature}
                >
                  {isPending && pendingAction === 'recommended' ? (
                    <span className="animate-pulse">Submitting…</span>
                  ) : (
                    <>
                      <ThumbsUp size={18} weight="bold" />
                      Recommended for approval
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => onAction('notRecommended')}
                  disabled={!canAct || pendingAction !== null || !hasSignature}
                >
                  {isPending && pendingAction === 'notRecommended' ? (
                    <span className="animate-pulse">Submitting…</span>
                  ) : (
                    <>
                      <ThumbsDown size={16} />
                      Not recommended
                    </>
                  )}
                </Button>

                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => onAction('pushback')}
                  disabled={!canAct || pendingAction !== null}
                >
                  <ArrowCounterClockwise size={16} />
                  Push back
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  disabled={!canAct || pendingAction !== null}
                  onClick={onFlagOpen}
                >
                  <WarningCircle size={16} />
                  Flag incomplete documents
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