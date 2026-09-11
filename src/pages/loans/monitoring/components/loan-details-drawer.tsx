import { useNavigate } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/src/components/ui/sheet";
import { Button } from "@/src/components/ui/button";
import { LoanTimeline } from "@/src/components/loan/loan-timeline";

interface LoanDetailsDrawerProps {
    applicationId: number | null;
    onClose: () => void;
}

/**
 * Loan Details drawer for the monitoring page.
 *
 * SHAPE CHANGE (Task 10): Previously this took a fully-populated
 * `LoanMonitoringRecord` and rendered its dummy fields (formNumber,
 * customerName, loanType, product, loanAmount, applicationDate,
 * lastActionDate, lastActionBy, timeLapsedHours, status). It now takes
 * just `applicationId: number | null` and renders the server-backed audit
 * timeline for that loan.
 *
 * WHY NO LOAN-DETAIL BODY: per the developer task instructions, we do not
 * introduce a new endpoint call to fetch the loan. `getLoanById` does not
 * exist in `src/lib/api/loans.ts`, `webloans.ts`, or `types.ts`, and the
 * backend `GET /api/loans/{id}` contract is deliberately not consumed here
 * until a typed `LoanResponse` interface is added in a follow-up.
 * The drawer therefore renders ONLY the timeline; the previous info-row
 * body (status, client info, loan details, SLA warning) is dropped — its
 * data came from dummy data with no `id` link and would either be empty
 * or fabricated if we tried to reuse it. The spec does not require the
 * drawer's existing info rows to be preserved.
 *
 * TASK 11 ADDITION — "Review & Process Application" button:
 * The drawer is the entry point into the approval workflow. We push the
 * user to `/loans/approval/<numericId>` and let that page do the real
 * fetch + render. The route guard on `/loans/approval/:loanId` is intentionally
 * permissive (auth-only — see `App.tsx`); the backend
 * `LoanWorkflowService.IsValidTransition` is the authoritative role gate,
 * so a Recommender / Evaluator / Approver / Admin all land here and only
 * see the workflow buttons their role unlocks.
 *
 * Deep-link contract: the parent page reads `?id=<numericId>` via
 * `useSearchParams` and seeds this prop; row-clicks from the monitoring
 * table also store `record.id` once the table is wired to real data.
 */
export function LoanDetailsDrawer({ applicationId, onClose }: LoanDetailsDrawerProps) {
    const isOpen = applicationId !== null;
    const navigate = useNavigate();

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-[420px] p-0 flex flex-col overflow-hidden">
                <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
                    <SheetTitle className="text-base">
                        Loan #{applicationId ?? "—"}
                    </SheetTitle>
                    <SheetDescription className="text-xs mt-1">
                        Audit trail &amp; history
                    </SheetDescription>
                </SheetHeader>

                {/* TASK 11 — Entry point into the approval workflow.
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
                            onClick={() => navigate(`/loans/approval/${applicationId}`)}
                        >
                            <ArrowRight size={16} weight="bold" />
                            Review &amp; Process Application
                        </Button>
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
