import { ArrowLeft, IdentificationBadge, LockSimple } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import type { PreLoanItem } from '../../api/loan-types'
import { LoanCreationGuideDialog } from './loan-creation-guide-dialog'

interface LoanCreationHeaderProps {
  userBranchId: string
  userBranchName: string
  selectedPreLoan: { id: string; payload: PreLoanItem | null }
  isDirty: boolean
}

export function LoanCreationHeader({
  userBranchId,
  userBranchName,
  selectedPreLoan,
  isDirty,
}: LoanCreationHeaderProps) {
  const navigate = useNavigate()

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
              {isDirty ? (
                <span className="text-amber-600">Unsaved changes</span>
              ) : (
                'Draft'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
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
