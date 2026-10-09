import { IdentificationBadge, LockSimple } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/primitives/badge'
import type { PreLoanItem } from '../../api/loan-types'
import {
  LOAN_STATUS_META,
  type LoanStatus,
} from '@/src/features/loans/model/loan-status'
import { cn } from '@/src/shared/lib/utils'

function statusLabel(status?: string): string {
  if (!status) return 'Draft'
  return LOAN_STATUS_META[status as LoanStatus]?.label ?? status
}

function statusClass(status?: string): string {
  if (!status) return LOAN_STATUS_META.Draft.className
  return LOAN_STATUS_META[status as LoanStatus]?.className ?? LOAN_STATUS_META.Draft.className
}

interface LoanCreationHeaderProps {
  userBranchId: string
  userBranchName: string
  selectedPreLoan: { id: string; payload: PreLoanItem | null }
  isDirty: boolean
  editLamId?: string
  editStatus?: string
}

export function LoanCreationHeader({
  userBranchId,
  userBranchName,
  selectedPreLoan,
  isDirty,
  editLamId,
  editStatus,
}: LoanCreationHeaderProps) {
  const isEditMode = !!editLamId

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">
            {isEditMode ? editLamId : 'New Loan Application'}
          </h1>
          <Badge
            variant="outline"
            className={cn('gap-1.5 py-1', statusClass(editStatus))}
          >
            <span
              className="h-2 w-2 rounded-full bg-amber-500"
              aria-hidden
            />
            {isEditMode ? statusLabel(editStatus) : 'Draft'}
          </Badge>
          {userBranchId && (
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/30 bg-primary/5 py-1 text-primary"
              title="Preloans are filtered to this branch"
            >
              <IdentificationBadge size={12} weight="bold" />
              <span>Branch</span>
              <span className="text-muted-foreground">·</span>
              <span>{userBranchName}</span>
            </Badge>
          )}
          {selectedPreLoan.payload && (
            <Badge
              variant="secondary"
              className="gap-1.5 py-1"
              title="Attached preloan"
            >
              <LockSimple size={12} weight="bold" />
              Preloan #{selectedPreLoan.payload.id}
              {selectedPreLoan.payload.formNumber && (
                <span className="text-[10px] text-muted-foreground">
                  · {selectedPreLoan.payload.formNumber}
                </span>
              )}
            </Badge>
          )}
          {isDirty && (
            <span className="animate-in fade-in text-xs text-muted-foreground">
              Unsaved changes
            </span>
          )}
        </div>
      </div>
    </header>
  )
}