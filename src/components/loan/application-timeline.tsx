import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
    ArrowRight, ArrowCounterClockwise, WarningCircle, ChatCircleDots,
    FileText, NotePencil, SortAscending, SortDescending, CaretDown,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { getLoanTimeline, type TimelineEvent } from "@/src/lib/api/loan-review";
import { queryKeys } from "@/src/lib/queryKeys";
import { describeEvent, relativeTime } from "@/src/lib/loan-timeline";
import { cn } from "@/src/lib/utils";

const PAGE_SIZE = 15;

type Filter = "all" | "workflow" | "remarks";

const TYPE_ICON: Record<TimelineEvent["type"], { icon: typeof ArrowRight; ring: string }> = {
    workflow:        { icon: ArrowRight,     ring: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400" },
    deviation:       { icon: WarningCircle,  ring: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400" },
    deviationRemark: { icon: ChatCircleDots, ring: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400" },
    documentRemark:  { icon: FileText,       ring: "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400" },
    remark:          { icon: NotePencil,     ring: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400" },
};

/** Fallback for events with an unrecognized or missing `type`. */
const DEFAULT_TYPE_ICON = { icon: NotePencil, ring: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400" };

const matchesFilter = (e: TimelineEvent, f: Filter) =>
    f === "all" || (f === "workflow" ? e.type === "workflow" : e.type !== "workflow" && !!e.type);

interface ApplicationTimelineProps {
    loanId: number;
    /**
     * "panel"  — review page: own bounded scroll region + sticky controls,
     *            so a long history never stretches the page.
     * "inline" — monitoring drawer: flows inside the drawer's own scroll.
     */
    variant?: "panel" | "inline";
}

export function ApplicationTimeline({ loanId, variant = "panel" }: ApplicationTimelineProps) {
    const [filter, setFilter] = useState<Filter>("all");
    const [newestFirst, setNewestFirst] = useState(true);

    const query = useInfiniteQuery({
        queryKey: queryKeys.loans.review.timeline(loanId),
        queryFn: ({ pageParam }) => getLoanTimeline(loanId, pageParam, PAGE_SIZE),
        initialPageParam: 1,
        getNextPageParam: (last) => {
            if (!last || typeof last.currentPage !== "number" || typeof last.pageSize !== "number" || typeof last.totalCount !== "number") {
                return undefined;
            }
            return last.currentPage * last.pageSize < last.totalCount ? last.currentPage + 1 : undefined;
        },
        staleTime: 30_000,
    });

    const loaded = query.data?.pages.flatMap((p) => p.items) ?? [];
    const totalCount = query.data?.pages[0]?.totalCount ?? 0;
    const remaining = Math.max(0, totalCount - loaded.length);

    const events = useMemo(() => {
        const filtered = loaded.filter((e) => matchesFilter(e, filter));
        // Server pages arrive newest-first; the toggle re-orders the loaded window.
        return newestFirst ? filtered : [...filtered].reverse();
    }, [loaded, filter, newestFirst]);

    const controls = (
        <div
            className={cn(
                "flex flex-wrap items-center justify-between gap-2",
                variant === "panel" && "sticky top-0 z-10 border-b bg-card/95 px-4 py-2 backdrop-blur",
            )}
        >
            <div className="flex items-center gap-1.5" role="group" aria-label="Filter history">
                {([["all", "Everything"], ["workflow", "Workflow"], ["remarks", "Remarks & deviations"]] as [Filter, string][]).map(
                    ([value, label]) => (
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
                    )
                )}
            </div>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground"
                onClick={() => setNewestFirst((v) => !v)}
            >
                {newestFirst ? <SortDescending size={14} weight="bold" /> : <SortAscending size={14} weight="bold" />}
                {newestFirst ? "Newest first" : "Oldest first"}
            </Button>
        </div>
    );

    const feed = (
        <>
            {query.isLoading ? (
                <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading application history">
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
            ) : query.isError ? (
                <Alert variant="destructive" className="m-4">
                    <WarningCircle />
                    <AlertTitle>Could not load the history</AlertTitle>
                    <AlertDescription>
                        <Button variant="outline" size="sm" onClick={() => query.refetch()}>Try again</Button>
                    </AlertDescription>
                </Alert>
            ) : events.length === 0 ? (
                <p className="p-6 text-center text-xs text-muted-foreground">Nothing recorded for this filter yet.</p>
            ) : (
                <ol className="relative space-y-5 p-4 before:absolute before:bottom-4 before:left-[31px] before:top-4 before:w-px before:bg-border">
                    {events.map((e, i) => {
                        const prev = events[i - 1];
                        const newDay =
                            !prev ||
                            format(new Date(prev.occurredAtUtc), "yyyy-MM-dd") !==
                                format(new Date(e.occurredAtUtc), "yyyy-MM-dd");
                        const { icon: Icon, ring } = TYPE_ICON[e.type as TimelineEvent["type"]] ?? DEFAULT_TYPE_ICON;
                        const sentence = describeEvent(e);
                        const isReturn = e.type === "workflow" && (e.toStatus === "ForRevision" || e.action === "PushedBack");

                        return (
                            <li key={e.id}>
                                {newDay && (
                                    <p className="mb-3 ml-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {format(new Date(e.occurredAtUtc), "EEEE, dd MMM yyyy")}
                                    </p>
                                )}
                                <div className="relative flex gap-3">
                                    <span
                                        className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border", ring)}
                                        aria-hidden
                                    >
                                        {isReturn ? <ArrowCounterClockwise size={14} weight="bold" /> : <Icon size={14} weight="bold" />}
                                    </span>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                            <span className="text-sm font-medium text-foreground">{e.actorName ?? "System"}</span>
                                            {e.actorRole && (
                                                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">{e.actorRole}</Badge>
                                            )}
                                            <time dateTime={e.occurredAtUtc} title={new Date(e.occurredAtUtc).toLocaleString()}>
                                                {relativeTime(e.occurredAtUtc)}
                                            </time>
                                        </p>
                                        <p className="text-sm">
                                            {sentence.headline}
                                            {sentence.subject && <span className="font-medium">: {sentence.subject}</span>}
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

            {/* Progressive disclosure: explicit, count-aware, never auto-fires. */}
            {query.hasNextPage && (
                <div className="flex justify-center p-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={query.isFetchingNextPage}
                        onClick={() => query.fetchNextPage()}
                    >
                        <CaretDown size={14} weight="bold" />
                        {query.isFetchingNextPage
                            ? "Loading…"
                            : `Load earlier events (${remaining} more)`}
                    </Button>
                </div>
            )}
            {!query.hasNextPage && loaded.length > 0 && (
                <p className="p-3 text-center text-[11px] text-muted-foreground">Beginning of history</p>
            )}
        </>
    );

    if (variant === "inline") {
        return (
            <div className="space-y-3">
                {controls}
                {feed}
            </div>
        );
    }

    return (
        <div className="max-h-[32rem] overflow-y-auto overscroll-contain rounded-md border bg-card">
            {controls}
            {feed}
        </div>
    );
}
