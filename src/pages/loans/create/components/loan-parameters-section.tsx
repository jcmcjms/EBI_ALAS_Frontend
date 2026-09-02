import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { Calculator, CurrencyDollar, CalendarBlank, LockSimple } from "@phosphor-icons/react";

export function LoanParametersSection() {
    const { control, register } = useFormContext();

    const proposedAmount = useWatch({ control, name: "loan.proposedAmount" }) || 0;
    const term = useWatch({ control, name: "loan.term" }) || 0;
    const interestRate = useWatch({ control, name: "loan.interestRate" }) || 1.5;

    // ── Estimated monthly amortization ────────────────────────────────────
    // Used by the "Est. Monthly" badge in the card header. The
    // Capacity-to-Pay Indicators panel that previously summarized NTHP,
    // total existing obligations, and DTI has been removed; only the
    // monthly payment estimate is retained as an at-a-glance signal.
    const monthlyPayment =
        term > 0 && proposedAmount > 0
            ? (proposedAmount + proposedAmount * (interestRate / 100) * (term / 12)) / term
            : 0;

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CurrencyDollar size={20} weight="bold" className="text-primary" />
                        3. Loan Parameters
                        <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
                            <LockSimple size={12} weight="bold" /> System Verified
                        </Badge>
                    </CardTitle>
                    {monthlyPayment > 0 && (
                        <Badge variant="secondary" className="font-normal text-xs flex items-center gap-1.5 py-1 px-3">
                            <Calculator size={13} weight="bold" />
                            Est. Monthly:{" "}
                            <span className="font-bold text-emerald-600">
                                ₱{monthlyPayment.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Row 1 — Product & Purpose */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Loan Product</Label>
                    <Input
                        {...register("loan.product")}
                        placeholder="e.g. Salary Loan, Multi-Purpose Loan"
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Purpose of Loan</Label>
                    <Input
                        {...register("loan.purpose")}
                        placeholder="e.g. Home renovation, tuition fees, debt consolidation"
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>

                {/* Row 2 — Amount, Term, Rate */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Proposed Amount (₱)</Label>
                    <Input
                        {...register("loan.proposedAmount", { valueAsNumber: true })}
                        type="number"
                        placeholder="0.00"
                        min={0}
                        readOnly
                        className="h-9 font-semibold bg-muted/50"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarBlank size={12} weight="bold" /> Term (months)
                    </Label>
                    <Input
                        {...register("loan.term", { valueAsNumber: true })}
                        type="number"
                        placeholder="e.g. 24"
                        min={1}
                        max={360}
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Interest Rate (% p.a.)</Label>
                    <Input
                        {...register("loan.interestRate", { valueAsNumber: true })}
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
                        {...register("loan.nthpDate")}
                        type="date"
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
