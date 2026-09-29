import { memo, useEffect, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowClockwise,
    ArrowLeft,
    Clock,
    CurrencyCircleDollar,
    Globe,
    Info,
    PlayCircle,
    Queue,
    Timer,
    Tray,
    UserCircle,
    WarningCircle,
} from "@phosphor-icons/react";

import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Spinner } from "@/src/components/ui/spinner";
import { formatWaiting, waitingMinutes } from "@/src/features/dashboard/components/pending-queue";
import { useSlaPolicy } from "@/src/features/loans/api/loan-review";
import {
    useClaimNext,
    useDeskQueue,
    type QueuedLoanDto,
} from "@/src/features/loans/hooks/use-desk-queue";
import { AGING_BADGE_CLASS, assessAging } from "@/src/features/loans/utils/loan-aging";
import { formatPhp, summarizeDeskQueue } from "@/src/features/loans/utils/desk-queue";
import { LOAN_STATUS_META, type LoanStatus } from "@/src/features/loans/utils/loan-status";
import { initialsOf } from "@/src/shared/lib/name-utils";
import { cn } from "@/src/shared/lib/utils";
import { useAuthStore } from "@/src/store/authStore";

export function ReviewDeskPage() {
    const navigate = useNavigate();
    const { data: desk, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useDeskQueue();
    const claim = useClaimNext();
    const slaPolicy = useSlaPolicy();
    const currentUserId = useAuthStore((s) => (s.user?.userId ? Number(s.user.userId) : undefined));

    // Resume: a lease survived a refresh / crash — pick up where we left off.
    useEffect(() => {
        if (desk?.currentClaim) {
            navigate(`/loans/approval/${desk.currentClaim.loanId}`, { replace: true });
        }
    }, [desk?.currentClaim, navigate]);

    const now = Date.now();
    const head = desk?.items[0];
    const queueBehind = useMemo(() => (desk ? desk.items.slice(1) : []), [desk]);
    const stats = useMemo(() => (desk ? summarizeDeskQueue(desk.items, now) : null), [desk, now]);

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
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()} disabled={isFetching}>
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
                    <div className="container mx-auto w-full max-w-5xl flex-1 space-y-5 px-6 py-6">
                        {/* Toolbar: live count + refresh */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-0.5" aria-live="polite">
                                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight tabular-nums">
                                    {desk.items.length} file{desk.items.length === 1 ? "" : "s"} waiting
                                    <span className="flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
                                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                                        live
                                    </span>
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Served oldest first · last checked {formatClock(dataUpdatedAt)} · auto-refreshes every 30s
                                </p>
                            </div>
                            <Button variant="outline" size="icon-sm" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh queue">
                                {isFetching ? <Spinner className="size-3.5" /> : <ArrowClockwise size={14} weight="bold" />}
                            </Button>
                        </div>

                        {/* KPI strip */}
                        {stats && (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <StatCard icon={<Queue size={16} weight="bold" />} label="In queue" value={String(stats.fileCount)} />
                                <StatCard icon={<Timer size={16} weight="bold" />} label="Longest wait" value={formatWaiting(stats.longestWaitMinutes)} />
                                <StatCard
                                    icon={<WarningCircle size={16} weight="bold" />}
                                    label="SLA breached"
                                    value={String(stats.slaBreachCount)}
                                    tone={stats.slaBreachCount > 0 ? "destructive" : "default"}
                                />
                                <StatCard
                                    icon={<CurrencyCircleDollar size={16} weight="bold" />}
                                    label="Pipeline value"
                                    value={formatPhp(stats.totalExposure)}
                                    hint="Sum of proposed amounts in this desk"
                                />
                            </div>
                        )}

                        {/* Next up — rich head card */}
                        {head && (
                            <NextUpCard
                                item={head}
                                canServe={canServe}
                                claiming={claim.isPending}
                                onServe={() => claim.mutate()}
                                currentUserId={currentUserId}
                                slaPolicy={slaPolicy.data ?? null}
                                now={now}
                            />
                        )}

                        {/* Pending queue — the backlog behind the head */}
                        <Card className="shadow-none">
                            <CardHeader className="flex-row items-center justify-between space-y-0 py-4">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <Queue size={16} weight="bold" />
                                    Pending queue
                                    <Badge variant="secondary" className="tabular-nums">{queueBehind.length}</Badge>
                                </CardTitle>
                                <span className="text-xs text-muted-foreground">Positions match Loan Monitoring ranks</span>
                            </CardHeader>
                            <CardContent className="p-0">
                                {queueBehind.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        No files waiting behind the head — new submissions appear here automatically.
                                    </p>
                                ) : (
                                    <ul className="divide-y">
                                        {queueBehind.map((item) => (
                                            <DeskQueueRow key={item.loanId} item={item} slaPolicy={slaPolicy.data ?? null} now={now} />
                                        ))}
                                    </ul>
                                )}
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

    return <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40">{body}</div>;
}

/* ── Next-up hero card ─────────────────────────────────────────────────── */
interface NextUpCardProps {
    item: QueuedLoanDto;
    canServe: boolean;
    claiming: boolean;
    onServe: () => void;
    currentUserId?: number;
    slaPolicy: Record<string, number> | null;
    now: number;
}

function NextUpCard({ item, canServe, claiming, onServe, currentUserId, slaPolicy, now }: NextUpCardProps) {
    const assessment = assessAging(item.status as LoanStatus, item.enqueuedAt, now, slaPolicy);
    const isMine = item.ownerUserId != null && item.ownerUserId === currentUserId;
    const heldByOther = item.ownerUserId != null && !isMine;

    return (
        <section aria-label="Next up" className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
            <div className="flex flex-col gap-4 p-5 pl-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-10 border">
                            <AvatarFallback>{initialsOf(item.clientName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm font-semibold tracking-tight">{item.lamId}</span>
                                <StatusBadge status={item.status} />
                                {item.hasDeviations && (
                                    <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                                        <WarningCircle size={12} weight="bold" /> deviations
                                    </Badge>
                                )}
                            </div>
                            <p className="truncate text-sm text-muted-foreground" title={item.clientName}>
                                {item.clientName}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
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
                        ) : (
                            <Badge variant="outline" className="text-primary">next up</Badge>
                        )}
                        <Button
                            className="gap-1.5"
                            disabled={!canServe}
                            onClick={onServe}
                            aria-keyshortcuts="Enter"
                            title={
                                heldByOther
                                    ? `Currently with ${item.ownerName} — frees after the lease expires`
                                    : undefined
                            }
                        >
                            {claiming ? <Spinner className="size-4" /> : <PlayCircle size={16} weight="bold" />}
                            Serve next
                            <kbd className="ml-0.5 rounded-sm border border-primary-foreground/40 px-1 text-[10px] font-normal text-primary-foreground/70">
                                Enter
                            </kbd>
                        </Button>
                    </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
                    <Fact label="Amount" value={formatPhp(item.proposedAmount)} strong />
                    <Fact label="Product" value={item.product || "\u2014"} title={`${item.productCode} \u2014 ${item.product}`} />
                    <Fact label="Loan type" value={item.loanType ?? "\u2014"} />
                    <Fact label="Branch" value={item.branchCode || "\u2014"} />
                    <Fact label="Term" value={item.termDays != null ? `${item.termDays} d` : "\u2014"} />
                    <Fact
                        label="Waiting"
                        value={formatWaiting(waitingMinutes(item.enqueuedAt))}
                        title={assessment.label}
                        tone={assessment.tier === "breach" ? "destructive" : assessment.tier === "warning" ? "warning" : "default"}
                    />
                </dl>

                {item.purpose && (
                    <p className="line-clamp-2 text-xs text-muted-foreground" title={item.purpose}>
                        Purpose: {item.purpose}
                    </p>
                )}
            </div>
        </section>
    );
}

/* ── Pending queue row (memoized) ── */
interface DeskQueueRowProps {
    item: QueuedLoanDto;
    slaPolicy: Record<string, number> | null;
    now: number;
}

const DeskQueueRow = memo(function DeskQueueRow({ item, slaPolicy, now }: DeskQueueRowProps) {
    const assessment = assessAging(item.status as LoanStatus, item.enqueuedAt, now, slaPolicy);
    const waitTone =
        assessment.tier === "breach"
            ? "text-destructive"
            : assessment.tier === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground";

    return (
        <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/60 text-xs font-semibold tabular-nums text-muted-foreground">
                #{item.position}
            </span>

            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium">{item.lamId}</span>
                    <StatusBadge status={item.status} />
                    {item.hasDeviations && (
                        <WarningCircle size={12} weight="bold" className="text-amber-600 dark:text-amber-400" aria-label="Has deviations" />
                    )}
                </div>
                <p className="truncate text-xs text-muted-foreground" title={`${item.clientName} · ${item.product} · Branch ${item.branchCode}`}>
                    <span className="font-medium text-foreground/85">{item.clientName}</span>
                    {" · "}{item.product}
                    {" · "}{item.loanType ?? "—"}
                    {" · "}{item.branchCode}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
                <span className="hidden text-sm font-medium tabular-nums sm:block">{formatPhp(item.proposedAmount)}</span>
                <span className={cn("flex items-center gap-1 text-xs tabular-nums", waitTone)}>
                    <Clock size={12} /> {formatWaiting(waitingMinutes(item.enqueuedAt))}
                </span>
                <AgingPill assessment={assessment} />
            </div>
        </li>
    );
});

/* ── Shared atoms ── */
function StatusBadge({ status }: { status: string }) {
    const meta = LOAN_STATUS_META[status as LoanStatus];
    if (!meta) return <Badge variant="outline">{status}</Badge>;
    return (
        <Badge variant="outline" className={cn("font-normal", meta.className)} title={meta.hint}>
            {meta.label}
        </Badge>
    );
}

function AgingPill({ assessment }: { assessment: ReturnType<typeof assessAging> }) {
    if (assessment.tier !== "warning" && assessment.tier !== "breach") return null;
    return (
        <Badge variant="outline" className={cn("h-4 px-1.5 text-[10px] font-normal", AGING_BADGE_CLASS[assessment.tier])}>
            {assessment.tier === "breach" ? "Aging" : "Watch"}
        </Badge>
    );
}

interface StatCardProps {
    icon: ReactNode;
    label: string;
    value: string;
    hint?: string;
    tone?: "default" | "destructive";
}

function StatCard({ icon, label, value, hint, tone = "default" }: StatCardProps) {
    return (
        <Card className="shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
                <span
                    className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-md border",
                        tone === "destructive"
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-border bg-muted/60 text-muted-foreground"
                    )}
                >
                    {icon}
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="truncate text-lg font-semibold tabular-nums tracking-tight" title={hint}>{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

interface FactProps {
    label: string;
    value: string;
    title?: string;
    strong?: boolean;
    tone?: "default" | "warning" | "destructive";
}

function Fact({ label, value, title, strong, tone = "default" }: FactProps) {
    return (
        <div className="min-w-0">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd
                className={cn(
                    "truncate text-sm tabular-nums",
                    strong ? "font-semibold" : "font-medium",
                    tone === "destructive" && "text-destructive",
                    tone === "warning" && "text-amber-600 dark:text-amber-400"
                )}
                title={title ?? value}
            >
                {value}
            </dd>
        </div>
    );
}

/* ── Centered state panel (empty / error / no-access) ── */
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
        <div className="container mx-auto w-full max-w-5xl space-y-5 px-6 py-6" aria-busy="true" aria-label="Loading desk queue">
            <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-8 w-8" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[76px]" />
                ))}
            </div>
            <Skeleton className="h-40" />
            <Card className="shadow-none">
                <CardContent className="divide-y p-0">
                    {[0, 1].map((row) => (
                        <div key={row} className="flex items-center gap-3 px-4 py-3">
                            <Skeleton className="size-7" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

function formatClock(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
