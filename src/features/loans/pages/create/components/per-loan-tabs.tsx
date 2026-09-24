import { type ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/src/components/ui/button";
import { FormTabStrip } from "@/src/components/ui/form-tab-strip";
import { useActiveLoan } from "../active-loan-context";
import type { SelectedLoan } from "@/src/features/loans/schemas/schema";

interface PerLoanTabsProps {
    /** DOM-id namespace. Required: several strips coexist on one page. */
    idPrefix: string;
    ariaLabel: string;
    activeSurface?: "sheet" | "card";
    /**
     * "hidden" keeps every panel mounted (safe for plain `register` fields with
     * per-panel prefixes — §3). "active-only" unmounts inactive panels — required
     * when the panel consumes loan-scoped `useFieldArray` instances from
     * LoanTransfersContext, which only ever point at the ACTIVE loan (§5).
     */
    mountStrategy?: "hidden" | "active-only";
    hasError?: (index: number) => boolean;
    metric?: (loan: SelectedLoan) => string | undefined;
    renderPanel: (loan: SelectedLoan, index: number) => ReactNode;
}

export function PerLoanTabs({
    idPrefix, ariaLabel, activeSurface = "card",
    mountStrategy = "hidden", hasError, metric, renderPanel,
}: PerLoanTabsProps) {
    const { loans, activeLoanNo, activeIndex, setActiveLoanNo } = useActiveLoan();

    return (
        <>
            <FormTabStrip
                idPrefix={idPrefix}
                ariaLabel={ariaLabel}
                activeSurface={activeSurface}
                items={loans.map((l, i) => ({
                    value: l.loanNo ?? "",
                    label: l.productCode,
                    hint: l.loanNo ? `…${l.loanNo.slice(-4)}` : "…",
                    metric: metric?.(l),
                    title: l.loanNo ? `${l.loanNo} · ${l.productDescription}` : l.productDescription,
                    hasError: hasError?.(i),
                }))}
                value={activeLoanNo}
                onValueChange={setActiveLoanNo}
                trailing={
                    <>
                        <Button type="button" variant="ghost" size="sm" className="gap-1"
                            disabled={activeIndex === 0}
                            onClick={() => setActiveLoanNo(loans[activeIndex - 1].loanNo)}>
                            <CaretLeft size={14} weight="bold" /> Previous
                        </Button>
                        <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
                            Loan {activeIndex + 1} of {loans.length}
                        </span>
                        <Button type="button" variant="ghost" size="sm" className="gap-1"
                            disabled={activeIndex === loans.length - 1}
                            onClick={() => setActiveLoanNo(loans[activeIndex + 1].loanNo)}>
                            Next <CaretRight size={14} weight="bold" />
                        </Button>
                    </>
                }
            />
            {loans.map((loan, i) => {
                if (mountStrategy === "active-only" && i !== activeIndex) return null;
                return (
                    <div
                        key={loan.loanNo}
                        id={`${idPrefix}-panel-${loan.loanNo}`}
                        role="tabpanel"
                        aria-labelledby={`${idPrefix}-tab-${loan.loanNo}`}
                        hidden={mountStrategy === "hidden" && i !== activeIndex}
                        className="pt-5"
                    >
                        {renderPanel(loan, i)}
                    </div>
                );
            })}
        </>
    );
}
