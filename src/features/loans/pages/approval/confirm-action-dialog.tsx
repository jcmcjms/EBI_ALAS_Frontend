import type { ReactElement } from 'react'
import {
  CheckCircle,
  ThumbsDown,
  ThumbsUp,
  WarningCircle,
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
import { cn } from '@/src/shared/lib/utils'
import { DraftSaveIndicator } from '@/src/features/loans/components/draft-save-indicator'
import type { ReviewDraftStatus } from '@/src/features/loans/hooks/use-review-draft'
import {
  MIN_REMARKS,
  collectRemarksInDialog,
  confirmDescriptionFor,
  confirmTitleFor,
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
  const needsRemarks = collectRemarksInDialog(action)
  const remarksOk = !needsRemarks || remarks.trim().length >= MIN_REMARKS
  const needsSignature = Boolean(action.signs)
  const hasSignature = Boolean(signatureDataUrl)
  const canConfirm = remarksOk && (!needsSignature || hasSignature) && !isPending

  const defaultTrigger = (
    <Button
      className={cn(
        'w-full gap-2 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100',
        action.verdict === 'NotRecommended' &&
          'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-900 disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100',
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
  )

  return (
    <AlertDialog>
      <AlertDialogTrigger render={children ?? defaultTrigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitleFor(action)}</AlertDialogTitle>
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
            {draftStatus && (
              <DraftSaveIndicator
                status={draftStatus}
                savedAt={draftSavedAt ?? null}
                errorMessage={draftError}
                onRetry={onRetryDraftSave}
              />
            )}
            {remarks.trim().length < MIN_REMARKS && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <WarningCircle size={12} weight="fill" /> At least{' '}
                {MIN_REMARKS} characters required
              </p>
            )}
          </div>
        )}
        {needsSignature && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Your e-signature on file
            </p>
            {hasSignature ? (
              <img
                src={signatureDataUrl!}
                alt="Your saved e-signature"
                className="h-16 w-full object-contain object-left"
              />
            ) : (
              <div className="space-y-2">
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <WarningCircle size={12} weight="fill" />
                  You need an e-signature on file for this action.
                </p>
                <Link
                  to="/account"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Add your signature
                </Link>
              </div>
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
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            {action.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
