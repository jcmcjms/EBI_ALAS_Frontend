import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/src/components/ui/sheet";
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
 * lastActionDate, lastApprover, timeLapsedHours, status). It now takes
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
 * Deep-link contract: the parent page reads `?id=<numericId>` via
 * `useSearchParams` and seeds this prop; row-clicks from the monitoring
 * table also store `record.id` once the table is wired to real data.
 */
export function LoanDetailsDrawer({ applicationId, onClose }: LoanDetailsDrawerProps) {
    const isOpen = applicationId !== null;

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
