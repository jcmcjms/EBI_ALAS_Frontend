import {
  ArrowLeft,
  Clock,
  ThumbsDown,
  ThumbsUp,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { RoutingChip } from './components/routing-chip'
import { ApprovalGroupTabs } from './components/approval-group-tabs'
import { useEscalationStore } from '@/src/features/loans/store/escalationStore'
import type { LoanDetailResponse } from '@/src/features/loans/api/loan-review'
import type { GroupLoanSummary } from './components/approval-group-tabs'
import {
  LOAN_STATUS_META,
  type LoanStatus,
} from '@/src/features/loans/model/loan-status'
import { cn } from '@/src/shared/lib/utils'
import { countNoun } from '@/src/shared/lib/format'

interface ApprovalPageHeaderProps {
  detail: LoanDetailResponse
  id: number | string
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
  const escalated = useEscalationStore((s) => s.isEscalated(id))
  const statusMeta = LOAN_STATUS_META[detail.status as LoanStatus]

  return (
    <header className="sticky top-[var(--header-height)] z-30 border-b bg-background">
      <div className="container mx-auto flex h-16 flex-wrap items-center justify-between gap-3 px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onNavigate('/loans/queue')}
          >
            <ArrowLeft size={14} weight="bold" aria-hidden />
            Review Desk
          </Button>
          <h1 className="text-xl font-semibold tracking-tight text-balance">
            Loan review and approval
          </h1>
          <Badge variant="outline" className="text-xs font-normal tabular-nums">
            {detail.lamId}
          </Badge>
          <Badge
            variant="outline"
            className={cn('gap-1.5', statusMeta?.className)}
            title={statusMeta?.hint}
          >
            <Clock size={12} weight="fill" aria-hidden />
            {statusMeta?.label ?? detail.status}
          </Badge>
          <RoutingChip loanId={id} />
          {deviationCount > 0 && (
            <Badge
              variant="outline"
              className="gap-1.5 border-warning-border bg-warning-surface text-warning"
            >
              <WarningCircle size={12} weight="fill" aria-hidden />
              {countNoun(deviationCount, 'deviation')}
            </Badge>
          )}
          {escalated && (
            <Badge
              variant="outline"
              className="border-warning-border bg-warning-surface text-warning"
            >
              Escalated
            </Badge>
          )}
          {detail.evaluationVerdict === 'EvaluatedNotRecommended' && (
            <Badge
              variant="outline"
              className="gap-1.5 border-warning-border bg-warning-surface text-warning"
            >
              <ThumbsDown size={12} weight="fill" aria-hidden />
              Evaluator: not recommended
            </Badge>
          )}
          {detail.evaluationVerdict === 'EvaluatedRecommended' && (
            <Badge
              variant="outline"
              className="gap-1.5 border-success-border bg-success-surface text-success"
            >
              <ThumbsUp size={12} weight="fill" aria-hidden />
              Evaluator: recommended
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canFlagAtDesk && !frozen && (
            <Button type="button" variant="outline" onClick={onFlag}>
              Flag missing documents
            </Button>
          )}
          <Badge
            variant="outline"
            className="gap-1.5 font-normal"
            title="Encoder who created this application"
          >
            <UserCircle size={14} aria-hidden />
            {detail.createdByName}
          </Badge>
        </div>
      </div>

      <ApprovalGroupTabs
        loans={groupLoans}
        currentLoanId={id}
        onSelect={(loanId) => onNavigate(`/loans/approval/${loanId}`)}
        statusOf={(s) => s}
      />
    </header>
  )
}
