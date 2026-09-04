import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
    Calculator,
    CalendarBlank,
    CheckCircle,
    CurrencyDollar,
    WarningCircle,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { CurrencyInput } from "@/src/components/ui/currency-input";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useLoanProducts } from "@/src/lib/api/loan-products";
import { computeExpectedFees } from "@/src/lib/loan-fee-rules";
import { useLoanComputations } from "@/src/hooks/use-loan-computations";

import { SectionCard } from "./section-card";
import { getSection } from "../sections";

/** Local PHP currency formatter — en-PH locale, plain comma grouping. */
function php(value: number): string {
    if (!Number.isFinite(value)) return "₱0.00";
    return `₱${value.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * The form stores `loan.product` as the pre-joined `"<code> - <description>"`
 * string the backend ships on `PendingLoanDto.productWithDescription`. The
 * LoanProduct catalog uses the *bare* code (`"PL"`, `"MPL"`, `"C35"`, …)
 * as its primary key. Extract the leading token so we can look up the
 * matching product rule and seed the smart-default fees.
 *
 * Returns `undefined` for inputs that don't follow the convention — the
 * form's auto-fill stays dormant in that case (no fees, no Reset button,
 * no warnings) rather than crashing on an unknown shape.
 */
function extractProductCode(productDisplayName: string | undefined): string | undefined {
    if (!productDisplayName) return undefined;
    const dash = productDisplayName.indexOf(" - ");
    return dash === -1
        ? productDisplayName.trim()
        : productDisplayName.slice(0, dash).trim();
}

export function LoanParametersSection() {
    const { register, control, setValue } = useFormContext();

    // ── Header "Est. Monthly" badge (legacy formula, unchanged) ───────
    // Kept on the legacy "add interest then divide by term" formula
    // so the AO doesn't see the badge jump on the first render. The
    // live PMT (used by the capacity-to-pay panel below) is computed
    // by the shared engine so the Zod gate and this UI stay in lockstep.
    const proposedAmount =
        useWatch({ control, name: "loan.proposedAmount" }) ?? 0;
    const term = useWatch({ control, name: "loan.term" }) ?? 0;
    const interestRate = useWatch({ control, name: "loan.interestRate" }) ?? 1.5;
    const productDisplayName = useWatch({ control, name: "loan.product" }) ?? "";

    // ── Fee field watchers ─────────────────────────────────────────────
    // Hoisted out of the conditional `{selectedProduct && (...)}` block
    // below so hook call order stays stable across renders. The smart-
    // default fees section only *renders* once a product is selected,
    // but these subscriptions must be registered unconditionally — see
    // Rules of Hooks (https://react.dev/link/rules-of-hooks). Calling
    // `useWatch` inside the conditional block produced the "change in
    // the order of Hooks" / "Rendered more hooks than during the
    // previous render" error the first time the product catalog
    // resolved and `selectedProduct` transitioned to defined.
    const notarialFee =
        useWatch({ control, name: "loan.notarialFee" }) ?? undefined;
    const docStamps =
        useWatch({ control, name: "loan.docStamps" }) ?? undefined;
    const insurance =
        useWatch({ control, name: "loan.insurance" }) ?? undefined;

    const estMonthlyLegacy =
        term > 0 && proposedAmount > 0
            ? (proposedAmount + proposedAmount * (interestRate / 100) * (term / 365)) / (term / 30)
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

    // ── Smart-default fee rules (the new "Smart Default + Editable ─────
    //    Override" behavior) ───────────────────────────────────────────────
    //
    // The loan-products catalog is bank-policy reference data — it lives
    // in `LoanProductResponse` (server) and is mirrored here from
    // `useLoanProducts`. We pick the active product by extracting the
    // bare code from the form's human-readable `loan.product` string.
    const { data: products } = useLoanProducts();
    const productCode = extractProductCode(productDisplayName);
    const selectedProduct = useMemo(
        () => products?.find((p) => p.code === productCode),
        [products, productCode]
    );

    const expectedFees = useMemo(
        () => computeExpectedFees(selectedProduct, proposedAmount),
        [selectedProduct, proposedAmount]
    );

    // ── Auto-population of fee fields ──────────────────────────────────
    //
    // Whenever (product, principal) changes, seed the three fee inputs
    // with the bank's standard values AND mirror them into the
    // `standardFeesSnapshot` so the Zod gate + audit trail know what
    // "standard" was at this moment. The snapshot is *the comparison
    // source* for the deviation rule — we don't recompute on submit
    // because the product rules table could have changed in the
    // interim, but the AO's intent is captured against what the table
    // said at entry time.
    //
    // We only seed when:
    //   1. A product is picked (selectedProduct !== undefined).
    //   2. The principal is positive (no point seeding fees on ₱0).
    //   3. The product rule for that fee exists (defensive — feeCode
    //      is optional on the catalog).
    //
    // We use `shouldDirty: false` so auto-fills don't dirty the form
    // (a manual "Reset to standard" still dirties, which is correct).
    useEffect(() => {
        if (!selectedProduct || proposedAmount <= 0) return;

        const snapshot = computeExpectedFees(selectedProduct, proposedAmount);
        setValue("loan.standardFeesSnapshot", snapshot, { shouldDirty: false });
        setValue("loan.notarialFee", snapshot.notarialFee, { shouldDirty: false });
        setValue("loan.docStamps", snapshot.docStamps, { shouldDirty: false });
        setValue("loan.insurance", snapshot.insurance, { shouldDirty: false });
    }, [selectedProduct, proposedAmount, setValue]);

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
                        <CalendarBlank size={12} weight="bold" /> Term (days)
                    </Label>
                    <Input
                        {...register("loan.term", { valueAsNumber: true })}
                        type="number"
                        placeholder="e.g. 720"
                        min={1}
                        max={2555}
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

            {/* ── Smart-Default Fee Section ─────────────────────────────────
             *
             * Three bank fees (notarial, doc stamps, insurance) that follow
             * the "Smart Default + Editable Override" pattern. The bank
             * policy lives in the `LoanProductResponse.fees[]` table; the
             * form auto-fills the standard value and lets the AO edit. Any
             * deviation beyond the rule's `maxAllowedDeviation` requires a
             * `feeDeviationJustification` on the Deviations section — the
             * Zod gate refuses to submit otherwise.
             *
             * Hidden when no product is picked yet (the snapshot is all
             * zero, and showing three zeros would invite an AO to start
             * typing fees before the product is even chosen). */}
            {selectedProduct && (
                <div className="mt-5 rounded-lg border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <CurrencyDollar size={13} weight="bold" />
                        Bank Fees (Smart Defaults)
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                Notarial Fee
                            </Label>
                            <CurrencyInput
                                value={notarialFee as number | undefined}
                                onChange={(v) =>
                                    setValue("loan.notarialFee", v, {
                                        shouldDirty: true,
                                    })
                                }
                                suggestedValue={expectedFees.notarialFee}
                                aria-label="Notarial fee"
                            />
                            {expectedFees.notarialFee > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                    Standard: {php(expectedFees.notarialFee)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                Doc Stamps
                            </Label>
                            <CurrencyInput
                                value={docStamps as number | undefined}
                                onChange={(v) =>
                                    setValue("loan.docStamps", v, { shouldDirty: true })
                                }
                                suggestedValue={expectedFees.docStamps}
                                aria-label="Doc stamps"
                            />
                            {expectedFees.docStamps > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                    Standard: {php(expectedFees.docStamps)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                Insurance
                            </Label>
                            <CurrencyInput
                                value={insurance as number | undefined}
                                onChange={(v) =>
                                    setValue("loan.insurance", v, { shouldDirty: true })
                                }
                                suggestedValue={expectedFees.insurance}
                                aria-label="Insurance"
                            />
                            {expectedFees.insurance > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                    Standard: {php(expectedFees.insurance)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
