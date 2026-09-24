import { useFormContext } from "react-hook-form";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { CheckCircle } from "@phosphor-icons/react";

import { SectionCard } from "./section-card";
import { PerLoanTabs } from "./per-loan-tabs";
import { getSection } from "@/src/features/loans/constants/sections";
import { useActiveLoan } from "../active-loan-context";
import type { LoanApplicationFormData } from "@/src/features/loans/schemas/schema";

export function VerificationSection() {
    const { loans } = useActiveLoan();
    const { formState } = useFormContext<LoanApplicationFormData>();
    const section = getSection("verification");

    return (
        <SectionCard
            step={section.step}
            title={section.label}
            description={section.description}
            icon={<CheckCircle size={20} weight="bold" className="text-primary" />}
            badge={loans.length > 0 ? <Badge variant="secondary">{loans.length} loan{loans.length === 1 ? "" : "s"}</Badge> : undefined}
        >
            {loans.length === 0 ? (
                <div className="rounded-none border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    Select loan numbers in Step 1.3 to record verification findings.
                </div>
            ) : (
                <PerLoanTabs
                    idPrefix="verification"
                    ariaLabel="Verification per loan"
                    mountStrategy="active-only"
                    hasError={(i) => Boolean(formState.errors.loans?.[i]?.verification)}
                    renderPanel={(_, i) => <VerificationFields loanIndex={i} />}
                />
            )}
        </SectionCard>
    );
}

function VerificationFields({ loanIndex }: { loanIndex: number }) {
    const { register, formState } = useFormContext<LoanApplicationFormData>();
    const findingsError = formState.errors.loans?.[loanIndex]?.verification?.findings?.message;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Findings / Notes</Label>
                {findingsError && <span className="text-xs text-destructive font-medium">{findingsError}</span>}
            </div>
            <textarea
                {...register(`loans.${loanIndex}.verification.findings`)}
                placeholder="Document any findings from verification (e.g., employment confirmed, payslip validated, collateral inspected)..."
                rows={3}
                aria-invalid={!!findingsError}
                className={
                    "w-full rounded-md border bg-transparent px-3 py-2 text-sm " +
                    "placeholder:text-muted-foreground focus-visible:border-ring " +
                    "focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y " +
                    (findingsError ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50" : "border-input")
                }
            />
        </div>
    );
}
