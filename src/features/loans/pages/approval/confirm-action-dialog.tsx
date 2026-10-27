import { useState, type ReactElement } from 'react'
import {
  CheckCircle,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { Button, buttonVariants } from '@/src/shared/ui/primitives/button'
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
import { RichTextEditor } from '@/src/shared/ui/data-display/rich-text-editor'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { cn } from '@/src/shared/lib/utils'
import { richTextToPlainText } from '@/src/shared/lib/rich-text'
import { DraftSaveIndicator } from '@/src/features/loans/components/draft-save-indicator'
import type { ReviewDraftStatus } from '@/src/features/loans/hooks/use-review-draft'
import {
  MIN_REMARKS,
  collectRemarksInDialog,
  confirmActionLabelFor,
  confirmDescriptionFor,
  confirmTitleFor,
  remarksPurposeFor,
  type WorkflowButtonDef,
} from './workflow-constants'

export function ConfirmActionDialog({
  action,
  remarks,
  onRemarksChange,
  onConfirm,
  isPending,
  signatureDataUrl,
  draftStatus,
  draftSavedAt,
  draftError,
  onRetryDraftSave,
  children,
}: {
  action: WorkflowButtonDef
  remarks: string
  onRemarksChange: (v: string) => void
  onConfirm: () => void
  isPending: boolean
  signatureDataUrl?: string | null
  draftStatus?: ReviewDraftStatus
  draftSavedAt?: number | null
  draftError?: string | null
  onRetryDraftSave?: () => void
  children?: ReactElement
}) {
  const [showRemarksError, setShowRemarksError] = useState(false)

  const needsRemarks = collectRemarksInDialog(action)
  const needsSignature = Boolean(action.signs)
  const hasSignature = Boolean(signatureDataUrl)

  // The editor emits HTML, so the length the API checks is the length of the
  // text inside it. Counting the markup let four visible characters pass a
  // ten character minimum.
  const remarksLength = richTextToPlainText(remarks).length
  const remarksError =
    needsRemarks && remarksLength < MIN_REMARKS
      ? (remarksPurposeFor(action) ?? 'Add your remarks.')
      : undefined

  // A missing signature is the one blocker the reviewer cannot resolve here, so
  // the button stays disabled and says why. Everything else validates on click.
  const blockedOnSignature = needsSignature && !hasSignature

  const handleConfirm = () => {
    if (remarksError) {
      setShowRemarksError(true)
      return
    }
    onConfirm()
  }

  const triggerIcon =
    action.kind === 'reject' ? (
      <XCircle size={16} />
    ) : action.verdict === 'NotRecommended' ? (
      <ThumbsDown size={16} weight="fill" />
    ) : action.verdict === 'Recommended' ? (
      <ThumbsUp size={16} weight="fill" />
    ) : (
      <CheckCircle size={16} weight="bold" />
    )

  const defaultTrigger = (
    <Button
      className="w-full gap-2 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
      variant={
        action.kind === 'reject'
          ? 'destructive'
          : action.verdict === 'NotRecommended'
            ? 'outline'
            : 'default'
      }
      disabled={isPending}
    >
      {triggerIcon}
      {action.label}
    </Button>
  )

  const confirmLabel = confirmActionLabelFor(action)

  return (
    <AlertDialog onOpenChange={(open) => !open && setShowRemarksError(false)}>
      <AlertDialogTrigger render={children ?? defaultTrigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitleFor(action)}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDescriptionFor(action)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {blockedOnSignature && (
          <div className="space-y-2 border border-warning-border bg-warning-surface p-3">
            <p className="text-xs font-medium text-foreground">
              This action is signed. Add your e-signature first.
            </p>
            <Link
              to="/account"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Add your signature
            </Link>
          </div>
        )}

        {!blockedOnSignature && needsSignature && hasSignature && (
          <figure className="space-y-1 border bg-muted/30 p-3">
            <figcaption className="text-xs text-muted-foreground">
              Signed as
            </figcaption>
            <img
              src={signatureDataUrl!}
              alt=""
              className="h-14 w-full object-contain object-left"
            />
          </figure>
        )}

        {needsRemarks && (
          <div className="space-y-1.5">
            <RichTextEditor
              value={remarks}
              onChange={onRemarksChange}
              disabled={isPending}
              ariaLabel="Remarks"
              invalid={Boolean(showRemarksError && remarksError)}
              placeholder="Amount is within the borrower's capacity, COE verified with HR"
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p
                id="confirm-remarks-help"
                className={cn(
                  'text-xs',
                  showRemarksError && remarksError
                    ? 'text-destructive'
                    : 'text-muted-foreground',
                )}
              >
                {showRemarksError && remarksError
                  ? remarksError
                  : (remarksPurposeFor(action) ?? 'Optional.') +
                    ` ${MIN_REMARKS} characters minimum.`}
              </p>
              {draftStatus && (
                <DraftSaveIndicator
                  status={draftStatus}
                  savedAt={draftSavedAt ?? null}
                  errorMessage={draftError}
                  onRetry={onRetryDraftSave}
                />
              )}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            className={cn(
              'gap-2',
              action.kind === 'reject' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}
            disabled={isPending || blockedOnSignature}
            onClick={handleConfirm}
          >
            {isPending && <Spinner className="size-3.5" aria-hidden />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
