import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/src/shared/ui/primitives/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/shared/ui/data-display/popover'
import { TreeStructure } from '@phosphor-icons/react'
import {
  getLoanRouting,
  loanReviewKeys,
} from '@/src/features/loans/api/loan-review'

interface RoutingChipProps {
  loanId: number | string
}

export function RoutingChip({ loanId }: RoutingChipProps) {
  const { data: routing } = useQuery({
    queryKey: loanReviewKeys.routing(loanId),
    queryFn: () => getLoanRouting(loanId),
    enabled: Boolean(loanId) && loanId !== 'NaN' && loanId !== 'undefined',
    staleTime: 60_000,
  })

  if (!routing || !routing.requiredApprovalTier) return null

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Badge
            variant="outline"
            className="gap-1 border-border bg-muted cursor-pointer text-foreground"
          >
            <TreeStructure size={12} weight="bold" aria-hidden />
            Tier {routing.requiredApprovalTier}
          </Badge>
        }
      />
      <PopoverContent className="w-96 space-y-1.5 p-3 text-xs">
        {routing.matchedRule && (
          <p className="font-medium">{routing.matchedRule}</p>
        )}
        {routing.evaluated && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
            <dt className="font-medium text-foreground">Cycle</dt>
            <dd>{routing.evaluated.cycle}</dd>
            <dt className="font-medium text-foreground">Severity</dt>
            <dd>
              {routing.evaluated.severity} deviation
            </dd>
            <dt className="font-medium text-foreground">Exposure</dt>
            <dd className="tabular-nums">
              ₱{routing.evaluated.exposure.toLocaleString()}
            </dd>
          </dl>
        )}
        {routing.escalatedFromTier && (
          <p className="text-warning">
            Tier {routing.escalatedFromTier} matched but has no approver
            configured, so it escalated per policy.
          </p>
        )}
        {routing.noAuthorityReason && (
          <p className="text-destructive">{routing.noAuthorityReason}</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
