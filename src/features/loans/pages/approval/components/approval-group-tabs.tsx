import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/src/components/ui/button";
import { FormTabStrip } from "@/src/components/ui/form-tab-strip";

/** Structural mirror of the group endpoint's member rows (loan-groups.ts). */
export interface GroupLoanSummary {
    id: number;
    lamId: string;
    productCode: string;
    status: string;
    unresolvedDocs: number;
}

interface ApprovalGroupTabsProps {
    loans: GroupLoanSummary[];
    currentLoanId: number;
    onSelect: (loanId: number) => void;
    statusOf: (status: string) => string;
}

/**
 * Sticky per-loan tab strip for multi-loan application groups.
 * Selection is navigation: the parent routes to /loans/approval/{id}, so
 * every id-keyed query on the page (sheet, audit trail, deviations, files,
 * checklist) follows automatically — one source of truth, zero desync.
 * Hidden for single-loan groups and in print.
 */
export function ApprovalGroupTabs({
    loans,
    currentLoanId,
    onSelect,
    statusOf,
}: ApprovalGroupTabsProps) {
    if (loans.length < 2) return null;

    const activeIndex = Math.max(
        0,
        loans.findIndex((l) => l.id === currentLoanId)
    );

    return (
        <div className="border-t print:hidden">
            <div className="container mx-auto px-6">
                <FormTabStrip
                    idPrefix="review"
                    ariaLabel="Loans in this application group"
                    activeSurface="card"
                    items={loans.map((l) => ({
                        value: String(l.id),
                        label: l.productCode || l.lamId,
                        hint: `\u2026${l.lamId.slice(-4)}`,
                        title: `${l.lamId} \u00b7 ${statusOf(l.status)}${
                            l.unresolvedDocs > 0
                                ? ` \u00b7 ${l.unresolvedDocs} doc(s) open`
                                : ""
                        }`,
                        hasWarning: l.unresolvedDocs > 0,
                    }))}
                    value={String(currentLoanId)}
                    onValueChange={(v) => onSelect(Number(v))}
                    trailing={
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                disabled={activeIndex === 0}
                                onClick={() => onSelect(loans[activeIndex - 1].id)}
                            >
                                <CaretLeft size={14} weight="bold" /> Previous
                            </Button>
                            <span
                                className="text-xs tabular-nums text-muted-foreground"
                                aria-live="polite"
                            >
                                Loan {activeIndex + 1} of {loans.length}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                disabled={activeIndex === loans.length - 1}
                                onClick={() => onSelect(loans[activeIndex + 1].id)}
                            >
                                Next <CaretRight size={14} weight="bold" />
                            </Button>
                        </>
                    }
                />
            </div>
        </div>
    );
}
