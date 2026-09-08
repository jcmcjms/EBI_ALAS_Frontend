import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CaretLeft, CaretRight, CurrencyDollar } from "@phosphor-icons/react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
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

    // Deselect-safe: never leave the panel pointing at a removed loan.
    useEffect(() => {
        if (loans.length === 0) return setActiveLoanNo("");
        if (!loans.some((l) => l?.loanNo === activeLoanNo)) setActiveLoanNo(loans[0].loanNo);
    }, [loans, activeLoanNo]);

    const activeIndex = Math.max(0, loans.findIndex((l) => l?.loanNo === activeLoanNo));
    const section = getSection("loan-params");

    if (loans.length === 0) {
        return (
            <SectionCard
                step={section.step}
                title={section.label}
                description={section.description}
                icon={<CurrencyDollar size={20} weight="bold" className="text-primary" />}
            >
                <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
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
            <Tabs value={activeLoanNo} onValueChange={setActiveLoanNo}>
                {/* Segmented track: horizontal scroll, never wraps → scales past 5 loans.
                    Radix gives roving tabindex + arrow-key navigation for free. */}
                <TabsList
                    className="mb-5 flex h-auto w-full max-w-full gap-1 overflow-x-auto rounded-lg bg-muted/60 p-1 [scrollbar-width:thin]"
                    aria-label="Selected loans"
                >
                    {loans.map((loan, i) => {
                        const hasError = Boolean(loanErrors?.[i]);
                        return (
                            <TabsTrigger
                                key={loan.loanNo}
                                value={loan.loanNo}
                                title={`${loan.loanNo} · ${loan.productDescription}`}
                                className="shrink-0 gap-1.5 rounded-md px-2.5 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                {/* Product-first label: the token the AO actually reasons about */}
                                <Badge variant="outline" className="text-[10px] font-semibold">{loan.productCode}</Badge>
                                <span className="font-mono tabular-nums text-muted-foreground">…{loan.loanNo.slice(-4)}</span>
                                {/* Status signal: jump straight to the loan that needs attention */}
                                {hasError && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-label="Validation errors on this loan" />
                                )}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {loans.map((loan, i) => (
                    /* Stable min-height prevents layout jump when switching loans */
                    <TabsContent key={loan.loanNo} value={loan.loanNo} className="min-h-[22rem] focus-visible:outline-none">
                        <LoanParametersFields fieldPrefix={`loans.${i}.parameters`} loanIndex={i} />
                    </TabsContent>
                ))}
            </Tabs>

            {/* Position counter + mouse shortcut; keyboard users already have arrow keys */}
            <div className="mt-4 flex items-center justify-between border-t pt-3">
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
            </div>
        </SectionCard>
    );
}