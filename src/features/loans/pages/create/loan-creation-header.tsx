import { useState } from 'react'
import { ArrowLeft, Broom, IdentificationBadge, LockSimple } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@/src/shared/ui/primitives/badge'
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
} from '@/src/shared/ui/feedback/alert-dialog'
import type { PreLoanItem } from '../../api/loan-types'
import { LoanCreationGuideDialog } from './loan-creation-guide-dialog'
import type { LoanDraftStatus } from './use-loan-creation-draft'

interface LoanCreationHeaderProps {
  userBranchId: string
  userBranchName: string
  selectedPreLoan: { id: string; payload: PreLoanItem | null }
  isDirty: boolean
  draftStatus?: LoanDraftStatus
  draftSavedAt?: number | null
  draftError?: string | null
  onRetryDraftSave?: () => void
  onClearForm?: () => void
}

function draftLabel(
  status: LoanDraftStatus | undefined,
  savedAt: number | null | undefined,
  isDirty: boolean,
) {
  if (status === 'saving') return 'Saving…'
  if (status === 'error') return 'Draft save failed'
  if (status === 'saved' && savedAt) {
    return `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  return isDirty ? 'Unsaved changes' : 'Draft'
}

export function LoanCreationHeader({
  userBranchId,
  userBranchName,
  selectedPreLoan,
  isDirty,
  draftStatus,
  draftSavedAt,
  draftError,
  onRetryDraftSave,
  onClearForm,
}: LoanCreationHeaderProps) {
  const navigate = useNavigate()
  const [clearOpen, setClearOpen] = useState(false)

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/loans/monitoring' })}
            aria-label="Back to applications"
          >
            <ArrowLeft size={20} weight="bold" />
          </Button>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-base font-semibold leading-tight tracking-tight">
              New Loan Application
            </h1>
            <p className="text-xs text-muted-foreground">
              {draftStatus === 'error' ? (
                <span className="inline-flex items-center gap-2 text-destructive">
                  {draftError || draftLabel(draftStatus, draftSavedAt, isDirty)}
                  {onRetryDraftSave && (
                    <button
                      type="button"
                      className="font-medium underline underline-offset-2 hover:opacity-80"
                      onClick={onRetryDraftSave}
                    >
                      Retry
                    </button>
                  )}
                </span>
              ) : draftStatus === 'saving' ? (
                draftLabel(draftStatus, draftSavedAt, isDirty)
              ) : draftStatus === 'saved' ? (
                draftLabel(draftStatus, draftSavedAt, isDirty)
              ) : isDirty ? (
                <span className="text-amber-600">Unsaved changes</span>
              ) : (
                'Draft'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onClearForm && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setClearOpen(true)}
              >
                <Broom size={14} weight="bold" /> Clear form
              </Button>
              <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear loan form?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear all fields and remove the saved draft.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep form</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        onClearForm()
                        setClearOpen(false)
                      }}
                    >
                      Clear form
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <LoanCreationGuideDialog />
          {userBranchId && (
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/30 bg-primary/5 py-1 text-xs text-primary"
            >
              <IdentificationBadge size={12} weight="bold" />
              Processing Branch:{' '}
              <span className="font-medium">{userBranchName}</span>
            </Badge>
          )}
          {selectedPreLoan.payload && (
            <Badge variant="secondary" className="gap-1.5 py-1 text-xs">
              <LockSimple size={12} weight="bold" />
              Preloan #{selectedPreLoan.payload.id}
            </Badge>
          )}
        </div>
      </div>
    </header>
  )
}
