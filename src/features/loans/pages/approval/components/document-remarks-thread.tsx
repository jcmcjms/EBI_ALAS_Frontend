import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChatCenteredText, ArrowBendLeftUp } from '@phosphor-icons/react'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'

import { Button } from '@/src/shared/ui/primitives/button'
import { formatLoanDateTime } from '@/src/shared/lib/format'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Textarea } from '@/src/shared/ui/primitives/textarea'

import {
  loanReviewKeys,
  postDocumentRemark,
  type DocumentRemarkDto,
} from '@/src/features/loans/api/loan-review'

function RemarkCard({
  remark,
  replyToName,
  onReply,
  canReply,
}: {
  remark: DocumentRemarkDto
  replyToName?: string
  onReply?: () => void
  canReply: boolean
}) {
  return (
    <div className="bg-background py-2">
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
          <ArrowBendLeftUp size={11} weight="bold" aria-hidden />
          {replyToName}
        </p>
      )}
      <p className="mt-1 whitespace-pre-wrap text-sm">{remark.body}</p>
      {canReply && onReply && (
        <Button
          size="sm"
          variant="ghost"
          className="-ml-2 mt-1 gap-1.5"
          onClick={onReply}
        >
          <ArrowBendLeftUp size={13} weight="bold" aria-hidden /> Reply
        </Button>
      )}
    </div>
  )
}

interface DocumentRemarksThreadProps {
  loanId: number | string
  checklistIdCode: string
  docId: number | null

  remarks: DocumentRemarkDto[]
  canWrite: boolean
  frozen: boolean
}

export function DocumentRemarksThread({
  loanId,
  checklistIdCode,
  docId,
  remarks,
  canWrite,
  frozen,
}: DocumentRemarksThreadProps) {
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: () =>
      postDocumentRemark(loanId, {
        checklistIdCode,
        docId,
        parentRemarkId: replyTo,
        body,
      }),
    onSuccess: () => {
      toastSuccess('Remark added.')
      setBody('')
      setReplyTo(null)
      qc.invalidateQueries({
        queryKey: loanReviewKeys.documentRemarks(loanId),
      })
    },
    onError: (e: unknown) => toastError(getErrorMessage(e)),
  })

  const roots = remarks.filter((r) => r.parentRemarkId === null)
  const repliesOf = (id: string) =>
    remarks.filter((r) => r.parentRemarkId === id)
  const nameOf = (id: string | null) =>
    id === null ? undefined : remarks.find((r) => r.id === id)?.authorName
  const replyTargetName = replyTo !== null ? nameOf(replyTo) : undefined

  return (
    <div className="space-y-2">
      {remarks.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No remarks on this document yet.
        </p>
      )}

      {roots.map((root) => (
        <div key={root.id} className="space-y-1.5">
          <RemarkCard
            remark={root}
            canReply={canWrite && !frozen}
            onReply={() => setReplyTo(root.id)}
          />
          {repliesOf(root.id).length > 0 && (
            <div className="ml-4 space-y-1.5 border-l-2 border-border pl-2.5">
              {repliesOf(root.id).map((r) => (
                <RemarkCard
                  key={r.id}
                  remark={r}
                  replyToName={nameOf(r.parentRemarkId)}
                  canReply={canWrite && !frozen}
                  onReply={() => setReplyTo(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {remarks
        .filter(
          (r) =>
            r.parentRemarkId !== null &&
            !roots.some((rt) => rt.id === r.parentRemarkId) &&
            !roots.some((rt) =>
              repliesOf(rt.id).some((x) => x.id === r.parentRemarkId),
            ),
        )
        .map((r) => (
          <RemarkCard
            key={r.id}
            remark={r}
            replyToName={nameOf(r.parentRemarkId)}
            canReply={canWrite && !frozen}
            onReply={() => setReplyTo(r.id)}
          />
        ))}

      {frozen ? (
        <p className="text-xs text-muted-foreground">
          This application is decided, so remarks are closed.
        </p>
      ) : canWrite ? (
        <div className="space-y-1.5 pt-1">
          {replyTargetName && (
            <p className="text-xs text-muted-foreground">
              Replying to <strong>{replyTargetName}</strong>{' '}
              <button
                type="button"
                className="underline"
                onClick={() => setReplyTo(null)}
              >
                cancel
              </button>
            </p>
          )}
          <Textarea
            rows={2}
            maxLength={2000}
            value={body}
            placeholder="Add a remark…"
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span aria-live="polite" className="text-xs text-muted-foreground">
              {body.trim().length > 1800 ? `${2000 - body.length} characters left` : ''}
            </span>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={body.trim().length < 3 || send.isPending}
              onClick={() => send.mutate()}
            >
              <ChatCenteredText size={13} weight="bold" />
              {replyTo !== null ? 'Reply' : 'Add remark'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Only reviewers and the encoder who filed this can add remarks.
        </p>
      )}
    </div>
  )
}
