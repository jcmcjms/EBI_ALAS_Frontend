import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CalendarBlank, CurrencyDollar } from "@phosphor-icons/react";

import { CurrencyInput } from "@/src/components/ui/currency-input";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useLoanProducts } from "@/src/lib/api/loan-products";
import { computeExpectedFees } from "@/src/lib/loan-fee-rules";

/** Local PHP currency formatter — en-PH locale, plain comma grouping. */
function php(value: number): string {
    if (!Number.isFinite(value)) return "₱0.00";
    return `₱${value.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Extract product code (e.g., "C21" from "C21 - Salary Loan").
 * Returns `undefined` for inputs that don't follow the convention —
 * the form's auto-fill stays dormant in that case (no fees, no Reset
 * button, no warnings) rather than crashing on an unknown shape.
 * Also returns `undefined` for "Consolidated" products since there is
 * no single product code to look up fees against.
 */
function extractProductCode(productDisplayName: string | undefined): string | undefined {
    if (!productDisplayName) return undefined;
    // Skip consolidated products — no single product code exists
    if (productDisplayName.startsWith("Consolidated")) return undefined;
    const dash = productDisplayName.indexOf(" - ");
    return dash === -1
        ? productDisplayName.trim()
        : productDisplayName.slice(0, dash).trim();
}

interface LoanParametersFieldsProps {
    /**
     * Field prefix for the parameters within a selected loan.
     * Example: "loans.0.parameters" for the first loan in the array.
     * This allows the component to be reused for each loan in the
     * multi-loan application workflow.
     */
    fieldPrefix: string;
    /** Index of the loan in the loans array (for display purposes). */
    loanIndex: number;
}

/**
 * Reusable panel content for Loan Parameters.
 * Extracted from LoanParametersSection so it can be composed inside
 * LoanParametersTabsSection which owns the multi-loan selector.
 * This component has NO SectionCard wrapper — it renders only the
 * field grid and smart-default fee block.
 */
export function LoanParametersFields({ fieldPrefix, loanIndex: _loanIndex }: LoanParametersFieldsProps) {
    const { register, control, setValue } = useFormContext();

    // Build prefixed field names
    const productPath = `${fieldPrefix}.product` as const;
    const proposedAmountPath = `${fieldPrefix}.proposedAmount` as const;
    const purposePath = `${fieldPrefix}.purpose` as const;
    const termPath = `${fieldPrefix}.term` as const;
    const interestRatePath = `${fieldPrefix}.interestRate` as const;
    const nthpDatePath = `${fieldPrefix}.nthpDate` as const;
    const notarialFeePath = `${fieldPrefix}.notarialFee` as const;
    const docStampsPath = `${fieldPrefix}.docStamps` as const;
    const insurancePath = `${fieldPrefix}.insurance` as const;
    const snapshotNotarialPath = `${fieldPrefix}.standardFeesSnapshot.notarialFee` as const;
    const snapshotDocStampsPath = `${fieldPrefix}.standardFeesSnapshot.docStamps` as const;
    const snapshotInsurancePath = `${fieldPrefix}.standardFeesSnapshot.insurance` as const;

    const proposedAmount =
        useWatch({ control, name: proposedAmountPath }) ?? 0;
    const productDisplayName = useWatch({ control, name: productPath }) ?? "";

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
        useWatch({ control, name: notarialFeePath }) ?? undefined;
    const docStamps =
        useWatch({ control, name: docStampsPath }) ?? undefined;
    const insurance =
        useWatch({ control, name: insurancePath }) ?? undefined;

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
        setValue(snapshotNotarialPath, snapshot.notarialFee, { shouldDirty: false });
        setValue(snapshotDocStampsPath, snapshot.docStamps, { shouldDirty: false });
        setValue(snapshotInsurancePath, snapshot.insurance, { shouldDirty: false });
        setValue(notarialFeePath, snapshot.notarialFee, { shouldDirty: false });
        setValue(docStampsPath, snapshot.docStamps, { shouldDirty: false });
        setValue(insurancePath, snapshot.insurance, { shouldDirty: false });
    }, [selectedProduct, proposedAmount, setValue, notarialFeePath, docStampsPath, insurancePath, snapshotNotarialPath, snapshotDocStampsPath, snapshotInsurancePath]);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

                <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Purpose of Loan</Label>
                    <Input
                        {...register(purposePath)}
                        placeholder="e.g. Home renovation, tuition fees, debt consolidation"
                        readOnly
                        className="h-9 bg-muted/50"
                    />
                </div>

                {/* Row 2 — Amount, Term, Rate */}
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
                        max={2555}
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
                                    setValue(notarialFeePath, v, {
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
                                    setValue(docStampsPath, v, { shouldDirty: true })
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
                                    setValue(insurancePath, v, { shouldDirty: true })
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
        </div>
    );
}