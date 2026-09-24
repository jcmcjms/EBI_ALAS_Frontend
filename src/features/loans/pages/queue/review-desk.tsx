import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    PlayCircle,
    CircleNotch,
    ArrowLeft,
    Clock,
    UserCircle,
} from "@phosphor-icons/react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Spinner } from "@/src/components/ui/spinner";
import { useDeskQueue, useClaimNext, type QueuedLoanDto } from "@/src/features/loans/hooks/use-desk-queue";
import { formatWaiting, waitingMinutes } from "@/src/features/dashboard/components/pending-queue";

export function ReviewDeskPage() {
    const navigate = useNavigate();
    const { data: desk, isLoading } = useDeskQueue();
    const claim = useClaimNext();

    // Resume: a lease survived a refresh / crash — pick up where we left off.
    useEffect(() => {
        if (desk?.currentClaim) {
            navigate(`/loans/approval/${desk.currentClaim.loanId}`, { replace: true });
        }
    }, [desk?.currentClaim, navigate]);

    const body = isLoading ? (
        <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
            <Spinner className="size-8" />
        </div>
    ) : desk?.currentClaim ? null : (
        <>
            <header className="sticky top-[var(--header-height)] z-30 border-b bg-background/95 backdrop-blur">
                <div className="container mx-auto flex h-16 items-center gap-3 px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate("/loans/monitoring")}
                        aria-label="Back to monitoring"
                    >
                        <ArrowLeft size={18} weight="bold" />
                    </Button>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Review Desk
                    </h1>
                    <Badge variant="outline" className="text-xs">
                        {desk?.deskLabel ?? "Review"}
                    </Badge>
                </div>
            </header>

            <div className="container mx-auto max-w-3xl space-y-6 px-6 py-10">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {desk?.deskLabel ?? "Review"} desk
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {desk?.items.length
                            ? `${desk.items.length} file${desk.items.length === 1 ? "" : "s"} waiting — oldest first.`
                            : "Queue is clear — nothing waiting at your desk."}
                    </p>
                </div>

                <Button
                    size="lg"
                    className="gap-2"
                    disabled={!desk?.items.length || claim.isPending}
                    onClick={() => claim.mutate()}
                    aria-keyshortcuts="Enter"
                >
                    {claim.isPending ? (
                        <CircleNotch className="animate-spin" size={18} weight="bold" />
                    ) : (
                        <PlayCircle size={18} weight="bold" />
                    )}
                    Serve next application
                </Button>

                {/* Transparency: what's coming, who holds what — no surprises. */}
                {desk && desk.items.length > 0 && (
                    <Card>
                        <CardContent className="p-0">
                            <ul className="divide-y">
                                {desk.items.map((item) => (
                                    <DeskQueueRow key={item.loanId} item={item} />
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );

    return (
        <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40">
            {body}
        </div>
    );
}

function DeskQueueRow({ item }: { item: QueuedLoanDto }) {
    const mins = waitingMinutes(item.enqueuedAt);

    return (
        <li className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="w-8 tabular-nums text-muted-foreground">
                #{item.position}
            </span>
            <span className="font-mono text-xs">{item.lamId}</span>
            <span className="min-w-0 flex-1 truncate">{item.clientName}</span>
            {item.ownerName ? (
                <Badge variant="secondary" className="gap-1">
                    <UserCircle size={12} /> {item.ownerName}
                </Badge>
            ) : item.isHead ? (
                <Badge variant="outline" className="text-primary">
                    next up
                </Badge>
            ) : null}
            <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                <Clock size={12} /> {formatWaiting(mins)}
            </span>
        </li>
    );
}