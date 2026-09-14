import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowRight,
    ArrowCounterClockwise,
    CheckCircle,
    XCircle,
    Paperclip,
    ChatCenteredText,
    FilePlus,
    Clock,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { RoleBadge } from "@/src/lib/role-badges";
import { cn } from "@/src/lib/utils";
import { getLoanHistory, type LoanHistoryEntry } from "@/src/lib/api/loans";
import { loanReviewKeys } from "@/src/lib/api/loan-review";
import {
    describeHistoryEntry,
    dayLabel,
    formatRelativeTime,
    TONE_MARKER_CLASS,
    type HistoryCategory,
    type HistoryEntryMeta,
} from "@/src/lib/loan-history";

interface LoanTimelineProps {
    applicationId: number;
    /** Embed in tight surfaces: hides the heading, event count and filter pills. */
    compact?: boolean;
    /** Cap visible entries with a "Show all" expander (sidebar-friendly). */
    limit?: number;
}

type Filter = "all" | HistoryCategory;
const FILTER_LABELS: Record<Filter, string> = {
    all: "All",
    workflow: "Workflow",
    file: "Files",
    remark: "Remarks",
};

function toneIcon(action: string, tone: HistoryEntryMeta["tone"]) {
    const cls = "h-3.5 w-3.5";
    if (action === "Created")
        return <FilePlus className={cls} weight="bold" />;
    switch (tone) {
        case "success":
            return <CheckCircle className={cls} weight="fill" />;
        case "danger":
            return <XCircle className={cls} weight="fill" />;
        case "warning":
            return <ArrowCounterClockwise className={cls} weight="bold" />;
        case "violet":
            return <Paperclip className={cls} weight="bold" />;
        case "teal":
            return <ChatCenteredText className={cls} weight="bold" />;
        case "info":
            return <ArrowRight className={cls} weight="bold" />;
        default:
            return <Clock className={cls} weight="bold" />;
    }
}

export function LoanTimeline({ applicationId, compact = false, limit }: LoanTimelineProps) {
    const [filter, setFilter] = useState<Filter>("all");
    const [expanded, setExpanded] = useState(false);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: loanReviewKeys.history(applicationId),
        queryFn: () => getLoanHistory(applicationId),
        enabled: Number.isFinite(applicationId) && applicationId > 0,
        staleTime: 30_000,
    });

    // Describe once, newest-first (reviewers open the drawer to see the
    // CURRENT state first; day headers keep the chronology navigable).
    const described = useMemo(
        () =>
            (data ?? [])
                .map((entry) => ({
                    entry,
                    meta: describeHistoryEntry(entry),
                }))
                .reverse(),
        [data]
    );

    const counts = useMemo(() => {
        const c: Record<Filter, number> = {
            all: described.length,
            workflow: 0,
            file: 0,
            remark: 0,
        };
        for (const { meta } of described) c[meta.category]++;
        return c;
    }, [described]);

    const visible = useMemo(
        () =>
            filter === "all"
                ? described
                : described.filter((d) => d.meta.category === filter),
        [described, filter]
    );

    const capped = limit && !expanded ? visible.slice(0, limit) : visible;

    const latestId = described[0]?.entry.id;

    return (
        <div className="space-y-4">
            {!compact && (
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Application History
                    </h3>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                        {described.length} event
                        {described.length === 1 ? "" : "s"}
                    </span>
                </div>
            )}

            {/* Category filter — long audit trails are scannable again. */}
            {!compact && (
                <div
                    className="flex gap-1 rounded-md bg-muted p-1"
                    role="group"
                    aria-label="Filter history"
                >
                    {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            aria-pressed={filter === f}
                            className={cn(
                                "flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                                filter === f
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {FILTER_LABELS[f]}
                            {counts[f] > 0 && (
                                <span className="ml-1 tabular-nums opacity-70">
                                    {counts[f]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {isLoading && (
                <div className="space-y-4" aria-label="Loading history">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[28px_1fr] gap-3"
                        >
                            <Skeleton className="h-7 w-7 rounded-full" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isError && (
                <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-center">
                    <p className="text-xs text-destructive">
                        Could not load the activity history.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                    >
                        Retry
                    </Button>
                </div>
            )}

            {!isLoading && !isError && visible.length === 0 && (
                <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    {filter === "all"
                        ? "No actions recorded yet."
                        : `No ${FILTER_LABELS[filter].toLowerCase()} events.`}
                </p>
            )}

            {!isLoading && !isError && capped.length > 0 && (
                <>
                    <ol
                        className="relative space-y-5 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-border"
                        aria-label="Application activity, newest first"
                    >
                        {capped.map(({ entry, meta }, idx) => {
                            const showDay =
                                idx === 0 ||
                                dayLabel(capped[idx - 1].entry.actionDate) !==
                                    dayLabel(entry.actionDate);
                            return (
                                <li key={entry.id} className="contents">
                                    {showDay && (
                                        <div
                                            className="relative pl-8"
                                            role="separator"
                                        >
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                {dayLabel(entry.actionDate)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="relative grid grid-cols-[28px_1fr] gap-3">
                                        <span
                                            className={cn(
                                                "z-10 flex h-7 w-7 items-center justify-center rounded-full border",
                                                TONE_MARKER_CLASS[meta.tone]
                                            )}
                                            aria-hidden
                                        >
                                            {toneIcon(entry.action, meta.tone)}
                                        </span>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                <span className="text-sm font-medium leading-snug">
                                                    {meta.title}
                                                </span>
                                                {entry.id === latestId && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px]"
                                                    >
                                                        Latest
                                                    </Badge>
                                                )}
                                                <time
                                                    dateTime={entry.actionDate}
                                                    title={new Date(
                                                        entry.actionDate
                                                    ).toLocaleString()}
                                                    className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground"
                                                >
                                                    {formatRelativeTime(
                                                        entry.actionDate
                                                    )}
                                                </time>
                                            </div>
                                            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                                {entry.actionBy}
                                                {entry.actionByRole && (
                                                    <RoleBadge
                                                        role={entry.actionByRole}
                                                    />
                                                )}
                                            </p>
                                            {entry.comments && (
                                                <blockquote className="rounded-md border-l-2 border-border bg-muted/40 px-2 py-1 text-xs italic text-muted-foreground">
                                                    &ldquo;{entry.comments}&rdquo;
                                                </blockquote>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                    {limit && visible.length > limit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground"
                            onClick={() => setExpanded((e) => !e)}
                        >
                            {expanded
                                ? "Show recent events only"
                                : `Show all ${visible.length} events`}
                        </Button>
                    )}
                </>
            )}
        </div>
    );
}
