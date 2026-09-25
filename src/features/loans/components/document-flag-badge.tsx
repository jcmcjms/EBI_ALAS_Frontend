import { FileDashed } from "@phosphor-icons/react";
import { Badge } from "@/src/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/src/components/ui/popover";

interface DocumentFlagDto {
    flaggedAt: string;
    flaggedById: number | null;
    reason: string | null;
    missingCount: number;
}

interface DocumentFlagBadgeProps {
    flag: DocumentFlagDto | null;
    /** Compact mode: icon-only with tooltip (for table rows). */
    compact?: boolean;
}

/**
 * Amber chip + popover showing: flagged by, when, reason, missing count.
 *
 * Mount in:
 *   - Monitoring drawer header (next to status badge)
 *   - Monitoring table rows (compact mode)
 *   - Review page header
 *   - Dashboard widget rows
 *
 * The status badge always tells the routing truth (ForChecking, ForApproval…).
 * This chip tells the document truth — two facts, two signals, never conflated.
 */
export function DocumentFlagBadge({ flag, compact }: DocumentFlagBadgeProps) {
    if (!flag) return null;

    if (compact) {
        return (
            <Popover>
                <PopoverTrigger
                    render={
                        <Badge
                            variant="outline"
                            className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 cursor-pointer"
                        >
                            <FileDashed size={12} weight="bold" />
                            {flag.missingCount}
                        </Badge>
                    }
                />
                <PopoverContent align="start" className="w-80 space-y-2 p-3 text-xs">
                    <p className="font-medium">
                        {flag.missingCount} document(s) flagged on{" "}
                        {new Date(flag.flaggedAt).toLocaleDateString()}
                    </p>
                    {flag.reason && (
                        <p className="text-muted-foreground">{flag.reason}</p>
                    )}
                    <p className="text-muted-foreground">
                        The workflow is not blocked. The flag clears automatically once
                        every requirement verifies complete on the document server.
                    </p>
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Badge
                        variant="outline"
                        className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 cursor-pointer"
                    >
                        <FileDashed size={14} weight="bold" />
                        {flag.missingCount} doc(s) flagged
                    </Badge>
                }
            />
            <PopoverContent align="start" className="w-80 space-y-2 p-3 text-xs">
                <p className="font-medium">
                    Flagged on {new Date(flag.flaggedAt).toLocaleDateString()}
                </p>
                {flag.reason && (
                    <p className="text-muted-foreground">{flag.reason}</p>
                )}
                <p className="text-muted-foreground">
                    The workflow is not blocked. The flag clears automatically once
                    every requirement verifies complete on the document server.
                </p>
            </PopoverContent>
        </Popover>
    );
}
