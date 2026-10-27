import {
  ArrowCounterClockwise,
  ThumbsDown,
  ThumbsUp,
  WarningCircle,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Button } from '@/src/shared/ui/primitives/button'
import { Textarea } from '@/src/shared/ui/primitives/textarea'
import { Label } from '@/src/shared/ui/primitives/label'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { DraftSaveIndicator } from '@/src/features/loans/components/draft-save-indicator'
import { ApplicationTimeline } from '@/src/features/loans/components/application-timeline'
import {
  LOAN_STATUS_META,
  type LoanStatus,
} from '@/src/features/loans/model/loan-status'
import type { ReviewDraftStatus } from '@/src/features/loans/hooks/use-review-draft'

type EvaluationAction = 'recommended' | 'notRecommended' | 'pushback'

const MIN_REMARKS = 10
const MAX_REMARKS = 2000

interface EvaluationActionsPanelProps {
  loanId: number | string
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
  loanId,
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
  const blockedOnSignature = showEvaluatorActions && !hasSignature
  const statusMeta = LOAN_STATUS_META[status as LoanStatus]
  const remarksTooShort = commentsRequired && comments.trim().length < MIN_REMARKS
  const busy = pendingAction !== null

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit lg:self-start">
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
          <div className="space-y-1.5">
            <Label htmlFor="eval-comments" className="font-medium">
              Remarks
            </Label>
            <Textarea
              id="eval-comments"
              rows={5}
              disabled={frozen || isPending}
              placeholder="Capacity is sufficient, COE verified with HR, no adverse finding"
              value={comments}
              onChange={(e) => onCommentsChange(e.target.value)}
              maxLength={MAX_REMARKS}
              aria-required={commentsRequired || undefined}
              aria-describedby="eval-comments-help"
            />
            <p id="eval-comments-help" className="text-xs text-muted-foreground">
              {commentsRequired
                ? `The Approver reads this before deciding. ${MIN_REMARKS} characters minimum.`
                : 'Optional. Recorded in the application history.'}
            </p>
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
            {blockedOnSignature && (
              <div className="space-y-2 border border-warning-border bg-warning-surface p-3">
                <p className="text-xs font-medium text-foreground">
                  Evaluating is signed. Add your e-signature first.
                </p>
                <Link
                  to="/account"
                  className="text-xs font-semibold text-primary underline underline-offset-2"
                >
                  Add your signature
                </Link>
              </div>
            )}

            {!blockedOnSignature && hasSignature && showEvaluatorActions && (
              <figure className="space-y-1 border bg-muted/30 p-3">
                <figcaption className="text-xs text-muted-foreground">
                  Signed as
                </figcaption>
                <img
                  src={signatureDataUrl!}
                  alt=""
                  className="h-12 w-full object-contain object-left"
                />
              </figure>
            )}

            {frozen ? (
              <p className="border border-dashed py-6 text-center text-xs text-muted-foreground">
                No decisions left to make on this application.
              </p>
            ) : showEvaluatorActions ? (
              <>
                <Button
                  type="button"
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => onAction('recommended')}
                  disabled={!canAct || busy || !hasSignature || remarksTooShort}
                >
                  {isPending && pendingAction === 'recommended' ? (
                    <Spinner className="size-4" aria-hidden />
                  ) : (
                    <ThumbsUp size={16} weight="fill" aria-hidden />
                  )}
                  Recommend for approval
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => onAction('notRecommended')}
                  disabled={!canAct || busy || !hasSignature}
                >
                  {isPending && pendingAction === 'notRecommended' ? (
                    <Spinner className="size-4" aria-hidden />
                  ) : (
                    <ThumbsDown size={16} weight="fill" aria-hidden />
                  )}
                  Do not recommend
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => onAction('pushback')}
                  disabled={!canAct || busy}
                >
                  <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
                  Push back
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={!canAct || busy}
                  onClick={onFlagOpen}
                >
                  <WarningCircle size={16} weight="bold" aria-hidden />
                  Flag missing documents
                </Button>
              </>
            ) : (
              <p className="border border-dashed py-6 text-center text-xs text-muted-foreground">
                This stage is not waiting on you.
              </p>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground">
              Activity
            </h3>
            <ApplicationTimeline loanId={loanId} variant="panel" />
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}
