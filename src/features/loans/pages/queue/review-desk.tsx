import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowClockwise,
    ArrowLeft,
    Clock,
    Globe,
    Info,
    PlayCircle,
    Tray,
    UserCircle,
    WarningCircle,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Spinner } from "@/src/components/ui/spinner";
import { formatWaiting, waitingMinutes } from "@/src/features/dashboard/components/pending-queue";
import {
    useClaimNext,
    useDeskQueue,
    type QueuedLoanDto,
} from "@/src/features/loans/hooks/use-desk-queue";
import { cn } from "@/src/shared/lib/utils";
import { useAuthStore } from "@/src/store/authStore";

export function ReviewDeskPage() {
    const navigate = useNavigate();
    const { data: desk, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useDeskQueue();
    const claim = useClaimNext();
    const currentUserId = useAuthStore((s) => (s.user?.userId ? Number(s.user.userId) : undefined));

    // Resume: a lease survived a refresh / crash — pick up where we left off.
    useEffect(() => {
        if (desk?.currentClaim) {
            navigate(`/loans/approval/${desk.currentClaim.loanId}`, { replace: true });
        }
    }, [desk?.currentClaim, navigate]);

    const head = desk?.items[0];
    const canServe =
        !!desk &&
        desk.items.length > 0 &&
        !claim.isPending &&
        (!head?.ownerUserId || head.ownerUserId === currentUserId);

    // Enter = serve next (the shortcut advertised on the button). Skipped
    // when focus is on an interactive element so a focused button's own
    // Enter activation can't double-fire a claim.
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== "Enter" || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
            const target = event.target as HTMLElement | null;
            if (target?.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
            if (!canServe) return;
            event.preventDefault();
            claim.mutate();
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [canServe, claim.mutate]);

    const hasDesk = !!desk && (desk.deskLabel !== "" || desk.items.length > 0 || !!desk.currentClaim);

    const body = isLoading ? (
        <DeskSkeleton />
    ) : isError ? (
        <DeskMessage
            icon={<WarningCircle size={22} weight="bold" />}
            tone="destructive"
            title="Couldn't load your desk"
            description="The queue service didn't respond. Your queue is unchanged on the server — try again."
            action={
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
                    <ArrowClockwise size={14} weight="bold" /> Retry
                </Button>
            }
        />
    ) : !hasDesk ? (
        <DeskMessage
            icon={<Info size={22} weight="bold" />}
            title="No queue for your role"
            description="Your role works from Loan Monitoring — the Review Desk serves Recommender, Evaluator and Approver queues."
            action={<Button size="sm" onClick={() => navigate("/loans/monitoring")}>Go to Loan Monitoring</Button>}
        />
    ) : desk.currentClaim ? null : (
        <>
            {/* Single title block: back action + desk identity + scope. */}
            <header className="sticky top-[var(--header-height)] z-30 border-b bg-background/95 backdrop-blur">
                <div className="container mx-auto flex h-14 items-center gap-3 px-6">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate("/loans/monitoring")}
                        aria-label="Back to monitoring"
                    >
                        <ArrowLeft size={16} weight="bold" />
                    </Button>
                    <h1 className="text-sm font-semibold tracking-tight">Review Desk</h1>
                    <Badge variant="secondary">{desk.deskLabel}</Badge>
                    {desk.scopeDescription && (
                        <span className="ml-auto flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                            <Globe size={12} weight="bold" className="shrink-0" />
                            <span className="truncate">{desk.scopeDescription}</span>
                        </span>
                    )}
                </div>
            </header>

            <main className="flex flex-1 flex-col">
                {desk.items.length === 0 ? (
                    <DeskMessage
                        icon={<Tray size={22} weight="bold" />}
                        title="Queue is clear"
                        description={`Nothing waiting at your ${desk.deskLabel} desk. Files promoted for approval appear here automatically.`}
                        meta={`Last checked ${formatClock(dataUpdatedAt)} · auto-refreshes every 30s`}
                        action={
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => refetch()}
                                    disabled={isFetching}
                                >
                                    {isFetching ? <Spinner className="size-3.5" /> : <ArrowClockwise size={14} weight="bold" />}
                                    Refresh
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => navigate("/loans/monitoring")}>
                                    Loan Monitoring
                                </Button>
                            </div>
                        }
                    />
                ) : (
                    <div className="container mx-auto w-full max-w-3xl flex-1 space-y-4 px-6 py-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-0.5" aria-live="polite">
                                <h2 className="text-lg font-semibold tracking-tight tabular-nums">
                                    {desk.items.length} file{desk.items.length === 1 ? "" : "s"} waiting
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Served oldest first · last checked {formatClock(dataUpdatedAt)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    onClick={() => refetch()}
                                    disabled={isFetching}
                                    aria-label="Refresh queue"
                                >
                                    {isFetching ? <Spinner className="size-3.5" /> : <ArrowClockwise size={14} weight="bold" />}
                                </Button>
                                <Button
                                    className="gap-1.5"
                                    disabled={!canServe}
                                    title={
                                        head?.ownerName && head.ownerUserId !== currentUserId
                                            ? `Currently with ${head.ownerName} — frees after the lease expires`
                                            : undefined
                                    }
                                    onClick={() => claim.mutate()}
                                    aria-keyshortcuts="Enter"
                                >
                                    {claim.isPending ? (
                                        <Spinner className="size-4" />
                                    ) : (
                                        <PlayCircle size={16} weight="bold" />
                                    )}
                                    Serve next
                                    <kbd className="ml-0.5 rounded-sm border border-primary-foreground/40 px-1 text-[10px] font-normal text-primary-foreground/70">
                                        Enter
                                    </kbd>
                                </Button>
                            </div>
                        </div>

                        {/* Transparency: what's coming, who holds what. */}
                        <Card>
                            <CardContent className="p-0">
                                <ul className="divide-y">
                                    {desk.items.map((item) => (
                                        <DeskQueueRow key={item.loanId} item={item} />
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <p className="text-xs text-muted-foreground">
                            Files lease exclusively while being reviewed — the holder's name stays on the file until the lease expires.
                        </p>
                    </div>
                )}
            </main>
        </>
    );

    return (
        <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40">
            {body}
        </div>
    );
}

/* ── Centered state panel (empty / error / no-access) ────────────────────
 * One shared layout so all three non-queue states read identically:
 * icon medallion → title → description → meta → actions, vertically
 * centered in the *remaining* viewport (flex-1), never top-anchored. */
interface DeskMessageProps {
    icon: ReactNode;
    title: string;
    description: string;
    tone?: "muted" | "destructive";
    meta?: string;
    action?: ReactNode;
}

function DeskMessage({ icon, title, description, tone = "muted", meta, action }: DeskMessageProps) {
    return (
        <div className="flex flex-1 items-center justify-center px-6 py-12">
            <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
                <div
                    className={cn(
                        "flex size-11 items-center justify-center rounded-full border",
                        tone === "destructive"
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-border bg-background text-muted-foreground"
                    )}
                >
                    {icon}
                </div>
                <div className="space-y-1">
                    <h2 className="text-base font-semibold tracking-tight">{title}</h2>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
                {action}
            </div>
        </div>
    );
}

/* ── Loading: skeleton mirrors the populated layout (no layout jump) ── */
function DeskSkeleton() {
    return (
        <div
            className="container mx-auto w-full max-w-3xl space-y-4 px-6 py-6"
            aria-busy="true"
            aria-label="Loading desk queue"
        >
            <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-28" />
            </div>
            <Card>
                <CardContent className="divide-y p-0">
                    {[0, 1, 2].map((row) => (
                        <div key={row} className="flex items-center gap-3 px-4 py-3">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

/* ── Queue row ── */
function DeskQueueRow({ item }: { item: QueuedLoanDto }) {
    const mins = waitingMinutes(item.enqueuedAt);
    const currentUserId = useAuthStore((s) => (s.user?.userId ? Number(s.user.userId) : undefined));
    const isMine = item.ownerUserId != null && item.ownerUserId === currentUserId;

    return (
        <li className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", item.isHead && "bg-primary/5")}>
            <span className="w-7 shrink-0 text-xs tabular-nums text-muted-foreground">#{item.position}</span>
            <span className="shrink-0 font-mono text-xs">{item.lamId}</span>
            <span className="min-w-0 flex-1 truncate" title={item.clientName}>
                {item.clientName}
            </span>
            {item.ownerName ? (
                isMine ? (
                    <Badge variant="secondary" className="gap-1">
                        <PlayCircle size={12} weight="bold" /> serving — resume
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="gap-1">
                        <UserCircle size={12} /> {item.ownerName}
                    </Badge>
                )
            ) : item.isHead ? (
                <Badge variant="outline" className="text-primary">next up</Badge>
            ) : (
                <span className="text-xs text-muted-foreground">waiting</span>
            )}
            <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                <Clock size={12} /> {formatWaiting(mins)}
            </span>
        </li>
    );
}

function formatClock(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
