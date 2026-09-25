import { useFormContext } from "react-hook-form";
import { CalendarBlank } from "@phosphor-icons/react";

import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

interface LoanParametersFieldsProps {
    /**
     * Field prefix for the parameters within a selected loan.
     * Example: "loans.0.parameters" for the first loan in the array.
     * This allows the component to be reused for each loan in the
     * multi-loan application workflow.
     */
    fieldPrefix: string;
}

/**
 * Reusable panel content for Loan Parameters.
 * Extracted from LoanParametersSection so it can be composed inside
 * LoanParametersTabsSection which owns the multi-loan selector.
 * This component has NO SectionCard wrapper — it renders only the
 * field grid (read-only parameters hydrated from the pending-loan
 * feed). The smart-default fee section was removed: the creation
 * form does not fetch the product catalog (403 for Encoders);
 * fee data lives on the review sheet from `LoanResponse` fields.
 */
export function LoanParametersFields({ fieldPrefix }: LoanParametersFieldsProps) {
    const { register } = useFormContext();

    // Build prefixed field names
    const productPath = `${fieldPrefix}.product` as const;
    const proposedAmountPath = `${fieldPrefix}.proposedAmount` as const;
    const purposePath = `${fieldPrefix}.purpose` as const;
    const termPath = `${fieldPrefix}.term` as const;
    const policyTermMonthsPath = `${fieldPrefix}.policyTermMonths` as const;
    const interestRatePath = `${fieldPrefix}.interestRate` as const;
    const nthpDatePath = `${fieldPrefix}.nthpDate` as const;

    return (
        <div className="space-y-5">
            {/* Outer grid uses 4 columns on md+ so row 2 can carry the
                new "Policy Term (months)" field alongside the existing
                Term (days). Loan Product + Purpose of Loan span the
                full first row (1 + 3 cols); NTHP Date sits alone in
                row 3 with the remaining columns empty — same rhythm as
                before, just one extra column available for the loan
                terms row. */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* Row 1 — Product & Purpose */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Loan Product</Label>
                    <Input
                        {...register(productPath)}
                        placeholder="e.g. Salary Loan, Multi-Purpose Loan"
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>

                <div className="space-y-1.5 md:col-span-3">
                    <Label className="text-xs text-muted-foreground">Purpose of Loan</Label>
                    <Input
                        {...register(purposePath)}
                        placeholder="e.g. Home renovation, tuition fees, debt consolidation"
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>

                {/* Row 2 — Amount, Term (days), Policy Term (months), Rate */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Proposed Amount (₱)</Label>
                    <Input
                        {...register(proposedAmountPath, { valueAsNumber: true })}
                        type="number"
                        placeholder="0.00"
                        min={0}
                        readOnly
                        className="h-9 font-semibold bg-muted/50"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarBlank size={12} weight="bold" /> Term (days)
                    </Label>
                    <Input
                        {...register(termPath, { valueAsNumber: true })}
                        type="number"
                        placeholder="e.g. 720"
                        min={1}
                        max={2617}
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>

                {/* Policy term in months — sourced from
                    `loan_data.total_amortization` via the consolidated
                    pending-loan SQL. Distinct from Term (days) above:
                    this is the authoritative input to amortization
                    calculations and stays stable across calendar-
                    boundary edge cases. Optional on the schema; this
                    field renders blank when the form was hydrated from
                    a flow that didn't surface a pending loan (e.g. the
                    approval-page mapper). */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarBlank size={12} weight="bold" /> Policy Term (months)
                    </Label>
                    <Input
                        {...register(policyTermMonthsPath, { valueAsNumber: true })}
                        type="number"
                        placeholder="e.g. 12"
                        min={1}
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Interest Rate (% p.a.)</Label>
                    <Input
                        {...register(interestRatePath, { valueAsNumber: true })}
                        type="number"
                        step="0.1"
                        placeholder="1.5"
                        min={0}
                        max={100}
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>

                {/* Row 3 — NTHP date */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">NTHP Date</Label>
                    <Input
                        {...register(nthpDatePath)}
                        type="date"
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>
            </div>
        </div>
    );
}
