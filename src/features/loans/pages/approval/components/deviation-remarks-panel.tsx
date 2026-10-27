import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowBendUpLeft,
  ChatCenteredText,
  PaperPlaneTilt,
  Receipt,
  Warning,
} from '@phosphor-icons/react'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'

import { Button } from '@/src/shared/ui/primitives/button'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Textarea } from '@/src/shared/ui/primitives/textarea'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { formatLoanDateTime } from '@/src/shared/lib/format'

import {
  getLoanDeviations,
  postDeviationRemark,
  pushbackWithRevision,
  requestDeviationUpdate,
  type DeviationRemarkDto,
  type LoanDeviationDto,
} from '@/src/features/loans/api/loan-review'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { DeviationUpdateRequestDialog } from './deviation-update-request-dialog'

const MIN_REMARK = 3
const MAX_REMARK = 2000

/** Carries which half of the two-call deviation request succeeded. */
class PartialDeviationRequestError extends Error {
  readonly notified: boolean
  readonly cause: unknown

  constructor(notified: boolean, cause: unknown) {
    super('Deviation update request failed part way through.')
    this.notified = notified
    this.cause = cause
  }
}

function RemarkCard({
  remark,
  replyToName,
  onReply,
}: {
  remark: DeviationRemarkDto
  replyToName?: string
  onReply?: () => void
}) {
  return (
    <div className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-xs font-semibold">{remark.authorName}</span>
        <Badge variant="outline" className="text-xs font-normal">
          {remark.authorRole}
        </Badge>
        <time
          dateTime={remark.createdAt}
          className="ml-auto text-xs text-muted-foreground tabular-nums"
        >
          {formatLoanDateTime(remark.createdAt)}
        </time>
      </div>
      {replyToName && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowBendUpLeft size={11} weight="bold" aria-hidden />
          {replyToName}
        </p>
      )}
      <p className="mt-1.5 text-sm whitespace-pre-wrap text-pretty">
        {remark.body}
      </p>
      {onReply && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="-ml-2 mt-1 gap-1.5"
          onClick={onReply}
        >
          <ArrowBendUpLeft size={13} weight="bold" aria-hidden />
          Reply
        </Button>
      )}
    </div>
  )
}

function DeviationThread({
  loanId,
  deviation,
  canWrite,
  frozen,
}: {
  loanId: number | string
  deviation: LoanDeviationDto
  canWrite: boolean
  frozen: boolean
}) {
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const fieldRef = useRef<HTMLTextAreaElement>(null)

  const send = useMutation({
    mutationFn: () =>
      postDeviationRemark(loanId, deviation.id, {
        body,
        parentRemarkId: parentId,
      }),
    onSuccess: () => {
      toastSuccess('Remark added.')
      setBody('')
      setParentId(null)
      qc.invalidateQueries({
        queryKey: loanKeys.review.deviations(loanId),
      })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })

  const nameOf = (id: string | null) =>
    id ? deviation.remarks.find((r) => r.id === id)?.authorName : undefined

  const replyTo = nameOf(parentId)
  const canPost = body.trim().length >= MIN_REMARK && !send.isPending

  const startReply = (remarkId: string) => {
    setParentId(remarkId)
    fieldRef.current?.focus()
  }

  return (
    <section
      id={`deviation-${deviation.id}`}
      className="scroll-mt-24 space-y-3 border-t pt-3 first:border-t-0 first:pt-0"
    >
      <header className="flex items-start gap-2">
        {deviation.isFeeOverride ? (
          <Receipt size={16} weight="fill" className="mt-0.5 text-warning" aria-hidden />
        ) : (
          <Warning size={16} weight="fill" className="mt-0.5 text-warning" aria-hidden />
        )}
        <h3 className="text-sm leading-snug font-semibold text-balance">
          {deviation.reasonText}
        </h3>
        {deviation.remarks.length > 0 && (
          <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
            <ChatCenteredText size={12} aria-hidden />
            {deviation.remarks.length}
          </span>
        )}
      </header>

      <div className="border-l-2 border-border pl-3">
        <p className="text-xs font-medium text-muted-foreground">
          Encoder&apos;s justification
        </p>
        <p className="mt-1 text-sm whitespace-pre-wrap text-pretty">
          {deviation.encoderJustification || 'None given.'}
        </p>
      </div>

      {deviation.remarks.length > 0 && (
        <div className="divide-y border-l-2 border-border pl-3">
          {deviation.remarks.map((r) => (
            <RemarkCard
              key={r.id}
              remark={r}
              replyToName={r.parentRemarkId ? nameOf(r.parentRemarkId) : undefined}
              onReply={canWrite && !frozen ? () => startReply(r.id) : undefined}
            />
          ))}
        </div>
      )}

      {canWrite &&
        (frozen ? (
          <p className="text-xs text-muted-foreground">
            This application is decided, so remarks are closed.
          </p>
        ) : (
          <div className="space-y-1.5 border-l-2 border-border pl-3">
            {replyTo && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowBendUpLeft size={11} weight="bold" aria-hidden />
                Replying to {replyTo}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => setParentId(null)}
                >
                  cancel
                </button>
              </p>
            )}
            <Textarea
              ref={fieldRef}
              rows={2}
              value={body}
              maxLength={MAX_REMARK}
              disabled={send.isPending}
              aria-label={
                replyTo ? `Reply to ${replyTo}` : 'Add a remark on this deviation'
              }
              placeholder="What the encoder needs to know about this deviation"
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span aria-live="polite" className="text-xs text-muted-foreground">
                {body.trim().length > MAX_REMARK - 200
                  ? `${MAX_REMARK - body.length} characters left`
                  : ''}
              </span>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={!canPost}
                onClick={() => send.mutate()}
              >
                {send.isPending ? (
                  <Spinner className="size-3.5" aria-hidden />
                ) : replyTo ? (
                  <ArrowBendUpLeft size={13} weight="bold" aria-hidden />
                ) : (
                  <PaperPlaneTilt size={13} weight="bold" aria-hidden />
                )}
                {replyTo ? 'Send reply' : 'Add remark'}
              </Button>
            </div>
          </div>
        ))}
    </section>
  )
}

export function DeviationRemarksPanel({
  loanId,
  canWrite,
  frozen,
  focusDeviationId,
}: {
  loanId: number | string
  canWrite: boolean
  frozen: boolean
  focusDeviationId?: string | null
}) {
  const qc = useQueryClient()
  const [updateOpen, setUpdateOpen] = useState(false)
  const deviations = useQuery({
    queryKey: loanKeys.review.deviations(loanId),
    queryFn: () => getLoanDeviations(loanId),
  })

  const list = deviations.data ?? []

  const requestUpdate = useMutation({
    mutationFn: async (instructions: string) => {
      // Two endpoints, not one transaction: the first records the request and
      // notifies the encoder, the second moves the application to ForRevision.
      // Track which one failed so the reviewer is told the true state.
      let notified = false
      try {
        await requestDeviationUpdate(loanId, instructions)
        notified = true
        await pushbackWithRevision(loanId, {
          sections: [
            {
              sectionId: 'deviations',
              comments: instructions,
            },
          ],
          overallComments: instructions,
        })
      } catch (error) {
        throw new PartialDeviationRequestError(notified, error)
      }
    },
    onSuccess: () => {
      toastSuccess('Sent back to the encoder.')
      setUpdateOpen(false)
      qc.invalidateQueries({ queryKey: loanKeys.review.deviations(loanId) })
      qc.invalidateQueries({ queryKey: loanKeys.review.history(loanId) })
      qc.invalidateQueries({ queryKey: loanKeys.review.detail(loanId) })
      qc.invalidateQueries({ queryKey: loanKeys.all })
    },
    onError: (e: unknown) => {
      if (e instanceof PartialDeviationRequestError && e.notified) {
        toastError(
          'The encoder was notified, but the application did not move back to them. Try again, or push it back from the Decision panel.',
        )
        qc.invalidateQueries({ queryKey: loanKeys.review.detail(loanId) })
        return
      }
      toastError(getErrorMessage(e))
    },
  })

  useEffect(() => {
    if (!focusDeviationId || list.length === 0) return
    document
      .getElementById(`deviation-${focusDeviationId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusDeviationId, list])

  if (deviations.isLoading) return <Spinner className="size-5" />

  if (deviations.isError) {
    return (
      <div className="space-y-2 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          The deviations could not be loaded.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => deviations.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {canWrite && !frozen && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setUpdateOpen(true)}
          >
            <ArrowBendUpLeft size={14} weight="bold" aria-hidden />
            Request deviation update
          </Button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="border border-dashed py-6 text-center text-xs text-muted-foreground">
          No deviations on this application.
        </p>
      ) : (
        list.map((d) => (
          <DeviationThread
            key={d.id}
            loanId={loanId}
            deviation={d}
            canWrite={canWrite}
            frozen={frozen}
          />
        ))
      )}

      <DeviationUpdateRequestDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        isPending={requestUpdate.isPending}
        onSubmit={(instructions) => requestUpdate.mutate(instructions)}
      />
    </div>
  )
}
