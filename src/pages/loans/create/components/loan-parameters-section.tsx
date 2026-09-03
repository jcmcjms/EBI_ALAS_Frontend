import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import {
    Calculator,
    CurrencyDollar,
    CalendarBlank,
    WarningCircle,
    CheckCircle,
} from "@phosphor-icons/react";

import { SectionCard } from "./section-card";
import { getSection } from "../sections";
import { useLoanComputations } from "@/src/hooks/use-loan-computations";

/** Local PHP currency formatter — en-PH locale, plain comma grouping. */
function php(value: number): string {
    if (!Number.isFinite(value)) return "₱0.00";
    return `₱${value.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function LoanParametersSection() {
    const { register } = useFormContext();

    // ── Header "Est. Monthly" badge (legacy formula, unchanged) ───────
    // Kept on the legacy "add interest then divide by term" formula
    // so the AO doesn't see the badge jump on the first render. The
    // live PMT (used by the capacity-to-pay panel below) is computed
    // by the shared engine so the Zod gate and this UI stay in lockstep.
    const proposedAmount =
        useWatch({ name: "loan.proposedAmount" }) ?? 0;
    const term = useWatch({ name: "loan.term" }) ?? 0;
    const interestRate = useWatch({ name: "loan.interestRate" }) ?? 1.5;

    const estMonthlyLegacy =
        term > 0 && proposedAmount > 0
            ? (proposedAmount + proposedAmount * (interestRate / 100) * (term / 12)) / term
            : 0;

    // ── Live capacity-to-pay panel ─────────────────────────────────────
    // Reads the same engine that drives the Approval Form preview and
    // the Zod gate. Showing the same values here means the AO can fix
    // the principal/term before submission instead of being blocked at
    // the Submit button. The numbers update on every keystroke without
    // re-rendering the rest of the wizard because the hook only
    // subscribes to the slices it reads.
    const metrics = useLoanComputations();
    const hasPrincipal = metrics.monthlyAmortization > 0;

    const exceedsDisposable = metrics.isAmortizationExceedingDisposable;
    const belowMin =
        metrics.minimumRequiredAmortization > 0 &&
        metrics.monthlyAmortization < metrics.minimumRequiredAmortization;

    const showCapacityPanel = hasPrincipal;
    const isHealthy = !exceedsDisposable && !belowMin;

    const section = getSection("loan-params");

    return (
        <SectionCard
            step={section.step}
            title={section.label}
            description={section.description}
            icon={<CurrencyDollar size={20} weight="bold" className="text-primary" />}
            badge={
                estMonthlyLegacy > 0 ? (
                    <Badge variant="secondary" className="font-normal text-xs flex items-center gap-1.5 py-1 px-3">
                        <Calculator size={13} weight="bold" />
                        Est. Monthly:{" "}
                        <span className="font-bold">
                            {php(estMonthlyLegacy)}
                        </span>
                    </Badge>
                ) : undefined
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
            </div>

            {/* ── Live Capacity-to-Pay Panel ─────────────────────────
             * Renders only when the AO has typed enough terms for the
             * PMT to be meaningful. The status mirrors the Zod gate's
             * exact rules; messages match what the AO will see at the
             * Submit button. Hidden while the form is "empty" so we
             * don't surface a "below minimum" warning on the empty
             * defaultValues. */}
            {showCapacityPanel && (
                <div
                    className={
                        "mt-5 rounded-lg border p-4 text-xs " +
                        (isHealthy
                            ? "border-primary/30 bg-primary/5 text-foreground"
                            : "border-destructive/40 bg-destructive/5 text-destructive")
                    }
                    role={isHealthy ? "status" : "alert"}
                >
                    <div className="mb-2 flex items-center gap-2">
                        {isHealthy ? (
                            <CheckCircle size={14} weight="fill" className="text-primary" />
                        ) : (
                            <WarningCircle size={14} weight="fill" />
                        )}
                        <span className="font-semibold uppercase tracking-wider">
                            Capacity-to-Pay
                        </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Monthly Amortization
                            </div>
                            <div className="font-bold tabular-nums">
                                {php(metrics.monthlyAmortization)}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Total Disposable
                            </div>
                            <div
                                className={
                                    "font-bold tabular-nums " +
                                    (exceedsDisposable ? "text-destructive" : "")
                                }
                            >
                                {php(metrics.totalDisposable)}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Minimum Required
                            </div>
                            <div
                                className={
                                    "font-bold tabular-nums " +
                                    (belowMin ? "text-destructive" : "")
                                }
                            >
                                {php(metrics.minimumRequiredAmortization)}
                            </div>
                        </div>
                    </div>

                    {!isHealthy && (
                        <p className="mt-3 leading-relaxed">
                            {exceedsDisposable && (
                                <>
                                    Monthly amortization exceeds the borrower's
                                    disposable by{" "}
                                    <span className="font-bold">
                                        {php(Math.abs(metrics.totalDisposable))}
                                    </span>
                                    .{" "}
                                </>
                            )}
                            {belowMin && (
                                <>
                                    Computed amortization is below the{" "}
                                    {php(metrics.minimumRequiredAmortization)}{" "}
                                    floor for this amount.{" "}
                                </>
                            )}
                            Adjust the principal or term before submitting.
                        </p>
                    )}
                </div>
            )}
        </SectionCard>
    );
}