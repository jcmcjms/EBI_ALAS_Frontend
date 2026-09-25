import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/src/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { TreeStructure } from "@phosphor-icons/react";
import { getLoanRouting, loanReviewKeys } from "@/src/features/loans/api/loan-review";

interface RoutingChipProps {
    loanId: number;
}

export function RoutingChip({ loanId }: RoutingChipProps) {
    const { data: routing } = useQuery({
        queryKey: loanReviewKeys.routing(loanId),
        queryFn: () => getLoanRouting(loanId),
        enabled: loanId > 0,
        staleTime: 60_000,
    });

    if (!routing || !routing.requiredApprovalTier) return null;

    const authorityTitle = routing.matchedRule
        ? extractAuthorityTitle(routing.matchedRule)
        : null;

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Badge
                        variant="outline"
                        className="gap-1 border-primary/30 bg-primary/5 text-primary cursor-pointer"
                    >
                        <TreeStructure size={12} weight="bold" />
                        Tier {routing.requiredApprovalTier}
                        {authorityTitle && ` · ${authorityTitle}`}
                    </Badge>
                }
            />
            <PopoverContent className="w-96 space-y-1.5 p-3 text-xs">
                {routing.matchedRule && (
                    <p className="font-medium">{routing.matchedRule}</p>
                )}
                {routing.evaluated && (
                    <p className="text-muted-foreground">
                        Evaluated: {routing.evaluated.cycle} · {routing.evaluated.severity} deviation ·
                        exposure ₱{routing.evaluated.exposure.toLocaleString()}
                    </p>
                )}
                {routing.escalatedFromTier && (
                    <p className="text-amber-700">
                        Tier {routing.escalatedFromTier} matched but has no configured approver — escalated per policy.
                    </p>
                )}
                {routing.noAuthorityReason && (
                    <p className="text-destructive">{routing.noAuthorityReason}</p>
                )}
            </PopoverContent>
        </Popover>
    );
}

/** Extract "Area Head" from "Area Head (Tier 2, ≤ 600,000, None)" */
function extractAuthorityTitle(matchedRule: string): string {
    const paren = matchedRule.indexOf(" (");
    return paren > 0 ? matchedRule.slice(0, paren) : matchedRule;
}