import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CaretLeft, CaretRight, CurrencyDollar } from "@phosphor-icons/react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { FormTabStrip } from "@/src/components/ui/form-tab-strip";
import type { LoanApplicationFormData } from "../schema";
import { getSection } from "../sections";
import { SectionCard } from "./section-card";
import { LoanParametersFields } from "./loan-parameters-fields";

/**
 * Step 3 shell. Owns the multi-loan selector so the chips and the panel
 * they control render inside ONE card (visible control→content relation).
 * Selection state is local + derived from `loans`; the field array itself
 * stays owned solely by active-loans-table (single-writer rule).
 */
export function LoanParametersTabsSection() {
    const { control, formState } = useFormContext<LoanApplicationFormData>();
    const loans = useWatch({ control, name: "loans" }) ?? [];
    const loanErrors = formState.errors.loans;

    const [activeLoanNo, setActiveLoanNo] = useState("");

    // Deselect-safe: derived during render so we never cascade a setState
    // inside an effect. If the user's selection is still in the list, keep it;
    // otherwise fall back to the first loan (or "" when the list is empty).
    const effectiveActiveLoanNo =
        activeLoanNo && loans.some((l) => l?.loanNo === activeLoanNo)
            ? activeLoanNo
            : (loans[0]?.loanNo ?? "");

    const activeIndex = Math.max(
        0,
        loans.findIndex((l) => l?.loanNo === effectiveActiveLoanNo)
    );
    const section = getSection("loan-params");

    if (loans.length === 0) {
        return (
            <SectionCard
                step={section.step}
                title={section.label}
                description={section.description}
                icon={<CurrencyDollar size={20} weight="bold" className="text-primary" />}
            >
                <div className="rounded-none border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    Select loan numbers in Step 1.3 to configure loan parameters.
                </div>
            </SectionCard>
        );
    }

    return (
        <SectionCard
            step={section.step}
            title={section.label}
            description={section.description}
            icon={<CurrencyDollar size={20} weight="bold" className="text-primary" />}
            badge={<Badge variant="secondary">{loans.length} loan{loans.length === 1 ? "" : "s"}</Badge>}
        >
            <FormTabStrip
                ariaLabel="Selected loans"
                activeSurface="card"
                items={loans.map((l, i) => ({
                    value: l.loanNo,
                    label: l.productCode,
                    hint: `…${l.loanNo.slice(-4)}`,
                    title: `${l.loanNo} · ${l.productDescription}`,
                    hasError: Boolean(loanErrors?.[i]),
                }))}
                value={effectiveActiveLoanNo}
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
            {loans.map((loan, i) => (
                <div
                    key={loan.loanNo}
                    id={`form-panel-${loan.loanNo}`}
                    role="tabpanel"
                    aria-labelledby={`form-tab-${loan.loanNo}`}
                    hidden={loan.loanNo !== effectiveActiveLoanNo}
                    className="min-h-[22rem] pt-5"
                >
                    <LoanParametersFields fieldPrefix={`loans.${i}.parameters`} />
                </div>
            ))}
        </SectionCard>
    );
}