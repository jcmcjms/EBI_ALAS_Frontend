import {
  XCircle,
  Clock,
  UserCircle,
  WarningCircle,
  ThumbsUp,
  ThumbsDown,
} from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { ArrowLeft } from '@phosphor-icons/react'
import { RoutingChip } from './components/routing-chip'
import { ApprovalGroupTabs } from './components/approval-group-tabs'
import { useEscalationStore } from '@/src/features/loans/store/escalationStore'
import type { LoanDetailResponse } from '@/src/features/loans/api/loan-review'
import type { GroupLoanSummary } from './components/approval-group-tabs'

interface ApprovalPageHeaderProps {
  detail: LoanDetailResponse
  id: number
  deviationCount: number
  frozen: boolean
  canFlagAtDesk: boolean
  onFlag: () => void
  groupLoans: GroupLoanSummary[]
  onNavigate: (path: string) => void
}

export function ApprovalPageHeader({
  detail,
  id,
  deviationCount,
  frozen,
  canFlagAtDesk,
  onFlag,
  groupLoans,
  onNavigate,
}: ApprovalPageHeaderProps) {
  return (
    <header className="sticky top-[var(--header-height)] z-30 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 flex-wrap items-center justify-between gap-3 px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate('/loans/monitoring')}
            aria-label="Back to monitoring"
          >
            <ArrowLeft size={18} weight="bold" />
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            Loan Review &amp; Approval
          </h1>
          <Badge variant="outline" className="text-xs">
            {detail.lamId}
          </Badge>
          <Badge
            variant="secondary"
            className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700"
          >
            <Clock size={12} weight="fill" />
            {detail.status}
          </Badge>
          <RoutingChip loanId={id} />
          {detail.hasDeviations && (
            <Badge
              variant="secondary"
              className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700"
            >
              <WarningCircle size={12} weight="fill" /> {deviationCount}{' '}
              deviation
              {deviationCount === 1 ? '' : 's'}
            </Badge>
          )}
          {useEscalationStore.getState().isEscalated(id) && (
            <Badge
              variant="secondary"
              className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800"
            >
              <WarningCircle size={12} weight="fill" /> Escalated
            </Badge>
          )}
          {}
          {detail.evaluationVerdict === 'EvaluatedNotRecommended' && (
            <Badge
              variant="secondary"
              className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800"
            >
              <ThumbsDown size={12} weight="fill" /> Evaluator: Not
              Recommended
            </Badge>
          )}
          {detail.evaluationVerdict === 'EvaluatedRecommended' && (
            <Badge
              variant="secondary"
              className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              <ThumbsUp size={12} weight="fill" /> Evaluator: Recommended
            </Badge>
          )}
          {detail.status === 'Cancelled' && (
            <Badge
              variant="secondary"
              className="gap-1.5 border-slate-400 bg-slate-100 text-slate-700 line-through"
            >
              <XCircle size={12} weight="fill" /> Cancelled by client
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canFlagAtDesk && !frozen && (
            <Button
              type="button"
              variant="outline"
              onClick={onFlag}
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <WarningCircle size={16} weight="bold" /> Flag Incomplete
              Documents
            </Button>
          )}
          <Badge variant="outline" className="gap-1.5 font-normal">
            <UserCircle size={14} />
            {detail.createdByName} (Encoder)
          </Badge>
        </div>
      </div>

      {}
      <ApprovalGroupTabs
        loans={groupLoans}
        currentLoanId={id}
        onSelect={(loanId) => onNavigate(`/loans/approval/${loanId}`)}
        statusOf={(s) => s}
      />
    </header>
  )
}