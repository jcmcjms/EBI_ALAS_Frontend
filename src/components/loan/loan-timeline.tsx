import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { getLoanHistory, type LoanHistoryEntry } from "@/src/lib/api/loans";
import { Badge } from "@/src/components/ui/badge";

interface LoanTimelineProps {
    applicationId: number;
}

/**
 * Vertical chronological audit trail for a single loan application.
 *
 * Source: `GET /api/loans/{applicationId}/history`
 * (EBI.ALAS.Api/Features/Loans/LoanEndpoints.cs → `MapGet("/{id:int}/history")`).
 *
 * The hook guard (`enabled: Number.isFinite(applicationId)`) prevents the
 * network call from firing when an upstream caller hands us a NaN/null id;
 * React Query would otherwise treat the disabled state as "still loading"
 * and we'd flash an empty state for one render before the caller resolves.
 */
export function LoanTimeline({ applicationId }: LoanTimelineProps) {
    const { data, isLoading } = useQuery({
        queryKey: ["loan-history", applicationId],
        queryFn: () => getLoanHistory(applicationId),
        enabled: Number.isFinite(applicationId),
    });

    if (isLoading) {
        return (
            <div className="text-sm text-muted-foreground">Loading history…</div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="text-sm text-muted-foreground">No actions recorded.</div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Application History
            </h3>
            <div className="relative flex flex-col gap-6 border-l-2 border-muted pl-6">
                {data.map((entry: LoanHistoryEntry) => (
                    <div key={entry.id} className="relative">
                        <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary" />
                        <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant={timelineBadgeVariant(
                                        entry.toStatus ?? entry.action
                                    )}
                                >
                                    {entry.toStatus ?? entry.action}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    by {entry.actionBy}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {format(
                                    new Date(entry.actionDate),
                                    "MMM d, yyyy h:mm a"
                                )}
                            </p>
                            {entry.comments && (
                                <blockquote className="border-l-2 border-muted pl-2 text-sm italic text-muted-foreground">
                                    "{entry.comments}"
                                </blockquote>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Map a free-form status / action string to a shadcn `Badge` variant.
 * Spec mapping (project-tasks §7 acceptance criteria):
 *   - reject / return → destructive
 *   - approve / release → default
 *   - submit / recommend → secondary
 *   - everything else → outline
 *
 * We `.toLowerCase()` so "Recommended", "RECOMMENDED" and "recommended" all
 * hit the same bucket; the underlying workflow enum is free-form on the
 * server (`LoanAction.Action` is `string`), so any future verb just falls
 * into the outline bucket until the helper is extended.
 */
function timelineBadgeVariant(
    status: string
): "default" | "secondary" | "destructive" | "outline" {
    const s = status.toLowerCase();
    if (s.includes("reject") || s.includes("return")) return "destructive";
    if (s.includes("approv") || s.includes("releas")) return "default";
    if (s.includes("submit") || s.includes("recommend")) return "secondary";
    return "outline";
}
