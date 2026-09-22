import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
    ArrowRight, ArrowCounterClockwise, WarningCircle, ChatCircleDots,
    FileText, NotePencil, SortAscending, SortDescending,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { getLoanTimeline, type TimelineEvent } from "@/src/lib/api/loan-review";
import { queryKeys } from "@/src/lib/queryKeys";
import { describeEvent, relativeTime } from "@/src/lib/loan-timeline";
import { cn } from "@/src/lib/utils";

type Filter = "all" | "workflow" | "remarks";

const TYPE_ICON: Record<TimelineEvent["type"], { icon: typeof ArrowRight; ring: string }> = {
    workflow:        { icon: ArrowRight,              ring: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400" },
    deviation:       { icon: WarningCircle,           ring: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400" },
    deviationRemark: { icon: ChatCircleDots,          ring: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400" },
    documentRemark:  { icon: FileText,                ring: "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400" },
    remark:          { icon: NotePencil,              ring: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400" },
};

const matchesFilter = (e: TimelineEvent, f: Filter) =>
    f === "all" ||
    (f === "workflow" ? e.type === "workflow" : e.type !== "workflow");

export function ApplicationTimeline({ loanId }: { loanId: number }) {
    const [filter, setFilter] = useState<Filter>("all");
    const [newestFirst, setNewestFirst] = useState(false);

    const query = useQuery({
        queryKey: queryKeys.loans.review.timeline(loanId),
        queryFn: () => getLoanTimeline(loanId),
        staleTime: 30_000,
    });

    const events = useMemo(() => {
        const list = (query.data ?? []).filter((e) => matchesFilter(e, filter));
        return newestFirst ? [...list].reverse() : list;
    }, [query.data, filter, newestFirst]);

    if (query.isLoading) {
        return (
            <div className="space-y-4" aria-busy="true" aria-label="Loading application history">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-40" />
                            <Skeleton className="h-3 w-2/3" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (query.isError) {
        return (
            <Alert variant="destructive">
                <WarningCircle />
                <AlertTitle>Could not load the history</AlertTitle>
                <AlertDescription>
                    <Button variant="outline" size="sm" onClick={() => query.refetch()}>
                        Try again
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5" role="group" aria-label="Filter history">
                    {([
                        ["all", "Everything"],
                        ["workflow", "Workflow"],
                        ["remarks", "Remarks & deviations"],
                    ] as [Filter, string][]).map(([value, label]) => (
                        <Button
                            key={value}
                            type="button"
                            size="sm"
                            variant={filter === value ? "secondary" : "ghost"}
                            className="h-7 text-xs"
                            aria-pressed={filter === value}
                            onClick={() => setFilter(value)}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground"
                    onClick={() => setNewestFirst((v) => !v)}
                    title={newestFirst ? "Show oldest first" : "Show newest first"}
                >
                    {newestFirst ? <SortDescending size={14} weight="bold" /> : <SortAscending size={14} weight="bold" />}
                    {newestFirst ? "Newest first" : "Oldest first"}
                </Button>
            </div>

            {events.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                    Nothing recorded for this filter yet.
                </p>
            ) : (
                <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border">
                    {events.map((e, i) => {
                        const prev = events[i - 1];
                        const newDay =
                            !prev ||
                            format(new Date(prev.occurredAtUtc), "yyyy-MM-dd") !==
                                format(new Date(e.occurredAtUtc), "yyyy-MM-dd");
                        const { icon: Icon, ring } = TYPE_ICON[e.type];
                        const sentence = describeEvent(e);
                        const isReturn = e.type === "workflow" && (e.toStatus === "ForRevision" || e.action === "PushedBack");

                        return (
                            <li key={e.id}>
                                {newDay && (
                                    <p className="mb-3 ml-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {format(new Date(e.occurredAtUtc), "EEEE, dd MMM yyyy")}
                                    </p>
                                )}
                                <div className="relative flex gap-3">
                                    <span
                                        className={cn(
                                            "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
                                            ring
                                        )}
                                        aria-hidden
                                    >
                                        {isReturn ? <ArrowCounterClockwise size={14} weight="bold" /> : <Icon size={14} weight="bold" />}
                                    </span>
                                    <div className="min-w-0 flex-1 space-y-1 pb-1">
                                        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                            <span className="text-sm font-medium text-foreground">
                                                {e.actorName ?? "System"}
                                            </span>
                                            {e.actorRole && (
                                                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                                                    {e.actorRole}
                                                </Badge>
                                            )}
                                            <time
                                                dateTime={e.occurredAtUtc}
                                                title={new Date(e.occurredAtUtc).toLocaleString()}
                                            >
                                                {relativeTime(e.occurredAtUtc)}
                                            </time>
                                        </p>
                                        <p className="text-sm">
                                            {sentence.headline}
                                            {sentence.subject && (
                                                <span className="font-medium">: {sentence.subject}</span>
                                            )}
                                        </p>
                                        {e.comment && (
                                            <blockquote className="border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                                                &ldquo;{e.comment}&rdquo;
                                            </blockquote>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}
