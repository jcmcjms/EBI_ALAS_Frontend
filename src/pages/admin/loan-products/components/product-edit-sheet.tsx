import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    CheckCircle,
    Database,
    PencilSimple,
    WarningCircle,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Separator } from "@/src/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";
import type { LoanProductResponse } from "@/src/lib/api/types";

/**
 * Edit sheet for a single loan product.
 *
 * Mirrors `PUT /api/loan-products/{code}` (and `UpdateLoanProductRequest`).
 * The sheet is intentionally narrow: it can only change the **8 policy
 * fields**. Code, Description, IsRetired, and LastSyncedAt are
 * sync-owned and are surfaced as read-only context so the operator
 * understands why those fields are not editable here.
 *
 * The current `LoanProductService.UpdateAsync` on the backend explicitly
 * preserves the sync-owned columns on this path, so even if a future
 * caller tried to PUT them, the change would be silently dropped.
 * Removing them from the form makes that contract visible.
 *
 * ## Validation
 *
 * Mirrors `UpdateLoanProductValidator` (FluentValidation) on the
 * backend so the form catches obvious mistakes client-side and the
 * backend stays the security boundary:
 *   - all amount fields >= 0
 *   - maxAmount >= minAmount
 *   - minTermDays, maxTermDays >= 0
 *   - maxTermDays >= minTermDays
 *   - maxTermDays <= 2555 (the absolute 7-year bank ceiling, mirrored
 *     from `LoanProductService.AbsoluteMaxTermDays`)
 *   - advanceInterestRate between 0 and 1 (decimal fraction;
 *     0.12 = 12% p.a.)
 */
const productFormSchema = z
    .object({
        // Eligibility bounds ─────────────────────────────────────────
        minAmount: z.coerce
            .number({ message: "Min amount is required." })
            .min(0, "Min amount cannot be negative."),
        maxAmount: z.coerce
            .number({ message: "Max amount is required." })
            .min(0, "Max amount cannot be negative."),
        // Term bounds (days) ───────────────────────────────────────
        minTermDays: z.coerce
            .number({ message: "Min term is required." })
            .int("Min term must be a whole number of days.")
            .min(0, "Min term cannot be negative."),
        maxTermDays: z.coerce
            .number({ message: "Max term is required." })
            .int("Max term must be a whole number of days.")
            .min(0, "Max term cannot be negative.")
            .max(2555, "Max term cannot exceed 2555 days (7 years)."),
        // Bank fees (flat PHP) ──────────────────────────────────────
        notarialFee: z.coerce
            .number({ message: "Notarial fee is required." })
            .min(0, "Notarial fee cannot be negative."),
        docStampFee: z.coerce
            .number({ message: "Doc-stamp fee is required." })
            .min(0, "Doc-stamp fee cannot be negative."),
        insuranceFee: z.coerce
            .number({ message: "Insurance fee is required." })
            .min(0, "Insurance fee cannot be negative."),
        // Advance-interest rate (decimal fraction, 0-1) ─────────────
        advanceInterestRate: z.coerce
            .number({ message: "Advance interest rate is required." })
            .min(0, "Advance interest rate cannot be negative.")
            .max(1, "Advance interest rate must be between 0 and 1 (e.g. 0.12 for 12% p.a.)."),
    })
    .refine((v) => v.maxAmount >= v.minAmount, {
        message: "Max amount must be greater than or equal to min amount.",
        path: ["maxAmount"],
    })
    .refine((v) => v.maxTermDays >= v.minTermDays, {
        message: "Max term must be greater than or equal to min term.",
        path: ["maxTermDays"],
    });

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductEditSheetProps {
    /**
     * The product being edited. `null` = sheet closed. The sheet is
     * driven by this prop (not local state) so the parent table is the
     * single source of truth for "which product is open".
     */
    product: LoanProductResponse | null;
    /** Permission gate — Admin only. UI mirrors `loan_product.manage`. */
    canEdit: boolean;
    /** Called when the user dismisses the sheet (Cancel, X, Esc, backdrop). */
    onClose: () => void;
    /**
     * Persist the form. Returns `true` on success so the parent can
     * keep the sheet open on failure (validation errors are surfaced
     * inline; the user needs to see what they typed). Returns
     * `false` so the parent can close on success.
     */
    onSave: (
        productCode: string,
        values: ProductFormValues
    ) => Promise<boolean>;
    /** True while the underlying mutation is in flight. */
    isSaving?: boolean;
}

export function ProductEditSheet({
    product,
    canEdit,
    onClose,
    onSave,
    isSaving = false,
}: ProductEditSheetProps) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isDirty, isSubmitting },
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema),
        // Mode "onBlur" matches the rest of the app: errors surface
        // when the user leaves the field, not on every keystroke.
        mode: "onBlur",
        defaultValues: emptyValues(),
    });

    // Seed the form from the product row whenever a new product is
    // opened. `reset` re-runs the resolver and clears the dirty state
    // so the Save button starts disabled.
    useEffect(() => {
        if (product) {
            reset(valuesFromProduct(product), { keepDirty: false });
        }
    }, [product, reset]);

    // Live mirror of the rate so we can show the percentage hint
    // (e.g. "0.1200 = 12% p.a.") next to the field. Picked from
    // the form (not `product`) so the user sees the *pending* value.
    const watchedRate = watch("advanceInterestRate");

    const submit = handleSubmit(async (values) => {
        if (!product) return;
        const ok = await onSave(product.code, values);
        if (ok) onClose();
    });

    const lastSyncedDisplay = useMemo(() => {
        if (!product) return "—";
        const d = new Date(product.lastSyncedAt);
        if (Number.isNaN(d.getTime())) return product.lastSyncedAt;
        return d.toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    }, [product]);

    return (
        <Sheet open={!!product} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="right"
                showCloseButton={false}
                className="flex flex-col p-0 sm:max-w-[640px]"
            >
                <SheetHeader className="border-b bg-muted/30 p-6 pb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <SheetTitle className="flex items-center gap-2">
                                <PencilSimple size={16} weight="bold" />
                                Edit Loan Product
                            </SheetTitle>
                            <SheetDescription className="mt-1">
                                Update policy fields for{" "}
                                <span className="font-semibold text-foreground">
                                    {product?.code}
                                </span>{" "}
                                — {product?.description}. Changes apply to
                                new loan applications immediately.
                            </SheetDescription>
                        </div>
                        {product && (
                            <Badge
                                variant="outline"
                                className={
                                    product.isRetired
                                        ? "border-red-600/25 bg-red-500/10 text-red-700 font-normal text-[10px] dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400"
                                        : "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 font-normal text-[10px] dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
                                }
                            >
                                {product.isRetired ? "Retired" : "Active"}
                            </Badge>
                        )}
                    </div>
                </SheetHeader>

                <form
                    onSubmit={submit}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    <div className="flex-1 space-y-6 overflow-y-auto p-6">
                        {/* ── Sync-owned context (read-only) ─────────── */}
                        <Card className="border bg-muted/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <Database
                                        size={14}
                                        weight="bold"
                                        className="text-muted-foreground"
                                    />
                                    Synced from webloan (read-only)
                                </CardTitle>
                                <CardDescription>
                                    Code, description, and retirement
                                    status are mirrored from the
                                    webloan catalog by the background
                                    sync. Run a manual sync to refresh.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 pt-0">
                                <ReadOnlyField
                                    label="Product Code"
                                    value={product?.code ?? "—"}
                                />
                                <ReadOnlyField
                                    label="Description"
                                    value={product?.description ?? "—"}
                                />
                                <ReadOnlyField
                                    label="Last Synced"
                                    value={lastSyncedDisplay}
                                />
                                <ReadOnlyField
                                    label="Retirement"
                                    value={
                                        product
                                            ? product.isRetired
                                                ? "Retired (webloan marked this product expired)"
                                            : "Active"
                                            : "—"
                                    }
                                />
                            </CardContent>
                        </Card>

                        {/* ── Eligibility bounds ──────────────────────── */}
                        <section className="space-y-4">
                            <SectionHeading
                                title="Eligibility Bounds"
                                description="Min and max principal (₱) and term (days) an AO can request for this product."
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <NumberField
                                    id="minAmount"
                                    label="Min Principal (₱)"
                                    error={errors.minAmount?.message}
                                    disabled={!canEdit}
                                    step="0.01"
                                    {...register("minAmount")}
                                />
                                <NumberField
                                    id="maxAmount"
                                    label="Max Principal (₱)"
                                    error={errors.maxAmount?.message}
                                    disabled={!canEdit}
                                    step="0.01"
                                    {...register("maxAmount")}
                                />
                                <NumberField
                                    id="minTermDays"
                                    label="Min Term (days)"
                                    error={errors.minTermDays?.message}
                                    disabled={!canEdit}
                                    step="1"
                                    {...register("minTermDays")}
                                />
                                <NumberField
                                    id="maxTermDays"
                                    label="Max Term (days)"
                                    error={errors.maxTermDays?.message}
                                    hint="Hard ceiling: 2555 days (7 years)."
                                    disabled={!canEdit}
                                    step="1"
                                    {...register("maxTermDays")}
                                />
                            </div>
                        </section>

                        <Separator />

                        {/* ── Bank fees ───────────────────────────────── */}
                        <section className="space-y-4">
                            <SectionHeading
                                title="Bank Fees (Flat, PHP)"
                                description="Standard flat fees deducted at disbursement, alongside advance interest."
                            />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <NumberField
                                    id="notarialFee"
                                    label="Notarial Fee (₱)"
                                    error={errors.notarialFee?.message}
                                    disabled={!canEdit}
                                    step="0.01"
                                    {...register("notarialFee")}
                                />
                                <NumberField
                                    id="docStampFee"
                                    label="Doc-Stamps Fee (₱)"
                                    error={errors.docStampFee?.message}
                                    disabled={!canEdit}
                                    step="0.01"
                                    {...register("docStampFee")}
                                />
                                <NumberField
                                    id="insuranceFee"
                                    label="Insurance Fee (₱)"
                                    error={errors.insuranceFee?.message}
                                    disabled={!canEdit}
                                    step="0.01"
                                    {...register("insuranceFee")}
                                />
                            </div>
                        </section>

                        <Separator />

                        {/* ── Interest ────────────────────────────────── */}
                        <section className="space-y-4">
                            <SectionHeading
                                title="Advance Interest Rate"
                                description="Annual rate, stored as a decimal fraction. The disbursement service multiplies this by principal and (termDays / 365) to compute the advance-interest deduction."
                            />
                            <div className="max-w-xs">
                                <NumberField
                                    id="advanceInterestRate"
                                    label="Rate (decimal fraction)"
                                    error={errors.advanceInterestRate?.message}
                                    hint={
                                        Number.isFinite(watchedRate)
                                            ? `${(Number(watchedRate) * 100).toFixed(2)}% p.a.`
                                            : "0 = 0% p.a. • 0.12 = 12% p.a. • 1 = 100% p.a."
                                    }
                                    disabled={!canEdit}
                                    step="0.0001"
                                    {...register("advanceInterestRate")}
                                />
                            </div>
                        </section>

                        {/* ── Permission / dirty-state notice ─────────── */}
                        {!canEdit && (
                            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                                <WarningCircle
                                    size={14}
                                    weight="fill"
                                    className="mt-0.5 shrink-0"
                                />
                                <span>
                                    You can view this product but the
                                    policy fields are read-only —
                                    changes require the{" "}
                                    <code>loan_product.manage</code>{" "}
                                    permission.
                                </span>
                            </div>
                        )}
                    </div>

                    <SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9"
                            onClick={onClose}
                            disabled={isSubmitting || isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="h-9"
                            disabled={
                                !canEdit ||
                                !isDirty ||
                                isSubmitting ||
                                isSaving
                            }
                        >
                            {isSubmitting || isSaving ? (
                                <>
                                    <Spinner className="size-3" /> Saving…
                                </>
                            ) : (
                                <>
                                    <CheckCircle
                                        size={14}
                                        weight="bold"
                                    />{" "}
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

// ── Small local helpers (kept in-file; not exported) ─────────────────────

function emptyValues(): ProductFormValues {
    return {
        minAmount: 0,
        maxAmount: 0,
        minTermDays: 0,
        maxTermDays: 0,
        notarialFee: 0,
        docStampFee: 0,
        insuranceFee: 0,
        advanceInterestRate: 0,
    };
}

function valuesFromProduct(p: LoanProductResponse): ProductFormValues {
    return {
        minAmount: p.minAmount,
        maxAmount: p.maxAmount,
        minTermDays: p.minTermDays,
        maxTermDays: p.maxTermDays,
        notarialFee: p.notarialFee,
        docStampFee: p.docStampFee,
        insuranceFee: p.insuranceFee,
        advanceInterestRate: p.advanceInterestRate,
    };
}

function SectionHeading({
    title,
    description,
}: {
    title: string;
    description?: string;
}) {
    return (
        <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {description}
                </p>
            )}
        </div>
    );
}

function ReadOnlyField({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
            </Label>
            <div className="rounded-md border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground/80">
                {value}
            </div>
        </div>
    );
}

// `NumberField` keeps the `register()` spread last so its own `error`
// / `hint` / `disabled` props take precedence over the underlying
// <input> defaults from the register call.
function NumberField({
    id,
    label,
    error,
    hint,
    disabled,
    step,
    ...inputProps
}: {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    disabled?: boolean;
    step?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">
                {label}
            </Label>
            <Input
                id={id}
                type="number"
                step={step}
                disabled={disabled}
                className="h-9"
                aria-invalid={error ? true : undefined}
                {...inputProps}
            />
            {error ? (
                <p className="flex items-center gap-1 text-[11px] text-destructive">
                    <WarningCircle size={11} weight="fill" />
                    {error}
                </p>
            ) : hint ? (
                <p className="text-[11px] text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}
