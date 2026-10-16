import type { ReactNode } from 'react'
import {
  CheckCircle,
  ThumbsDown,
  ThumbsUp,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
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
import {
  MIN_REMARKS,
  collectRemarksInDialog,
  confirmDescriptionFor,
  type WorkflowButtonDef,
} from './workflow-constants'

export function ConfirmActionDialog({
  action,
  remarks,
  onRemarksChange,
  onConfirm,
  isPending,
  children,
}: {
  action: WorkflowButtonDef
  remarks: string
  onRemarksChange: (v: string) => void
  onConfirm: () => void
  isPending: boolean
  children?: ReactNode
}) {
  const needsRemarks = collectRemarksInDialog(action)
  const remarksOk = !needsRemarks || remarks.trim().length >= MIN_REMARKS

  const defaultTrigger = (
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
  )

  return (
    <AlertDialog>
      <AlertDialogTrigger render={children ?? defaultTrigger} />
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
