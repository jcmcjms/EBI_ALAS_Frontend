import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock } from "@phosphor-icons/react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/src/components/ui/sheet";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { LoanTimeline } from "@/src/components/loan/loan-timeline";
import { cn } from "@/src/lib/utils";
import { getLoanById } from "@/src/lib/api/loans";
import { LOAN_STATUS_META, type LoanStatus } from "@/src/lib/loan-status";
import type { LoanMonitoringRecord } from "../types";

interface LoanDetailsDrawerProps {
    applicationId: number | null;
    onClose: () => void;
    /** Monitoring record from the parent table — carries queue fields
     *  that the detail endpoint may not yet return. */
    record?: LoanMonitoringRecord | null;
}

/**
 * Loan Details drawer for the monitoring page.
 *
 * Enriched header: shows LAM ID, borrower name, and live status badge
 * so the drawer identifies the file the way the bank does.
 *
 * TASK 11 ADDITION — "Review & Process Application" button:
 * The drawer is the entry point into the approval workflow. We push the
 * user to `/loans/approval/<numericId>` and let that page do the real
 * fetch + render.
 */
export function LoanDetailsDrawer({
    applicationId,
    onClose,
    record,
}: LoanDetailsDrawerProps) {
    const isOpen = applicationId !== null;
    const navigate = useNavigate();

    const detail = useQuery({
        queryKey: ["loan-detail", applicationId],
        queryFn: () => getLoanById(applicationId!),
        enabled: applicationId !== null && applicationId > 0,
        staleTime: 30_000,
    });

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-[420px] p-0 flex flex-col overflow-hidden">
                <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
                    <SheetTitle className="text-base font-semibold tracking-tight">
                        {detail.data?.lamId ??
                            `Loan #${applicationId ?? "\u2014"}`}
                    </SheetTitle>
                    <SheetDescription className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        {detail.data ? (
                            <>
                                <span className="truncate font-medium text-foreground">
                                    {detail.data.firstName}{" "}
                                    {detail.data.middleName
                                        ? `${detail.data.middleName[0]}. `
                                        : ""}
                                    {detail.data.lastName}
                                </span>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[10px] font-normal",
                                        LOAN_STATUS_META[
                                            detail.data.status as LoanStatus
                                        ]?.className
                                    )}
                                >
                                    {LOAN_STATUS_META[
                                        detail.data.status as LoanStatus
                                    ]?.label ?? detail.data.status}
                                </Badge>
                            </>
                        ) : (
                            "Audit trail & history"
                        )}
                    </SheetDescription>
                </SheetHeader>

                {/* Entry point into the approval workflow.
                 *
                 * Only shown when an application is actually selected (the
                 * `applicationId &&` guard short-circuits when the drawer is
                 * closed or the row click was missing an id). We hand the
                 * numeric id through `?id=` so the approval page can use
                 * `useSearchParams` to hydrate the page without a route-param
                 * refactor. The button is full-width to draw attention to
                 * it as the primary action of the drawer — the timeline
                 * below is supporting context, not the drawer's purpose. */}
                {applicationId && (
                    <div className="px-6 py-3 border-b bg-muted/20">
                        <Button
                            className="w-full gap-2"
                            onClick={() =>
                                navigate(`/loans/approval/${applicationId}`)
                            }
                        >
                            <ArrowRight size={16} weight="bold" />
                            Review &amp; Process Application
                        </Button>
                    </div>
                )}

                {/* Queue position banner */}
                {record?.queueStage && (
                    <div
                        role="status"
                        className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground mx-6 mt-3"
                    >
                        {record.isQueueHead ? (
                            <>
                                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                <span>
                                    On the {record.queueStage.toLowerCase()} desk now — reviewing:{" "}
                                    <span className="font-medium text-foreground">
                                        {record.queueOwnerName ?? "unassigned"}
                                    </span>
                                </span>
                            </>
                        ) : (
                            <>
                                <Clock size={14} weight="bold" className="shrink-0" />
                                <span>
                                    Position {record.queuePosition} of {record.queueLength} in the{" "}
                                    {record.queueStage.toLowerCase()} queue. It moves to{" "}
                                    {record.queueOwnerName ?? "the designated reviewer"} automatically when the
                                    current file clears.
                                </span>
                            </>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6">
                    {applicationId !== null ? (
                        <LoanTimeline applicationId={applicationId} />
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            Select an application to view its history.
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
