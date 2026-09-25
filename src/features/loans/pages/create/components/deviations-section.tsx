import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Badge } from "@/src/components/ui/badge";
import { Warning, Check, Receipt, Circle } from "@phosphor-icons/react";

import { DEVIATION_REASONS, type DeviationReason } from "@/src/features/loans/schemas/schema";
import type { LoanApplicationFormData } from "@/src/features/loans/schemas/schema";
import { SectionCard } from "./section-card";
import { PerLoanTabs } from "./per-loan-tabs";
import { getSection } from "@/src/features/loans/constants/sections";
import { useActiveLoan } from "../active-loan-context";
import { useDeviationCatalog, type DeviationCatalogItemDto } from "@/src/features/admin/users/hooks/use-deviation-catalog";

// Typed view of the deviations error subtree returned by RHF's
// errors object.
type DeviationsErrors = {
    otherRemarks?: { message?: string };
    deviationDetails?: { message?: string };
    feeDeviationJustification?: { message?: string };
    deviationJustifications?: Record<string, { message?: string }>;
};

/**
 * Tolerance (in ₱) for "is this fee *really* overridden?" — matches the
 * `FEES_TOLERANCE` used by `loanApplicationSchema`'s root superRefine and
 * `CurrencyInput`'s `VALUE_TOLERANCE`. Keeping all three in lockstep
 * prevents the schema's "required" gate from disagreeing with the UI's
 * "show the field" gate.
 */
const FEE_OVERRIDE_TOLERANCE = 0.01;

export function DeviationsSection() {
    const { loans } = useActiveLoan();
    const { formState } = useFormContext<LoanApplicationFormData>();
    const section = getSection("deviations");

    return (
        <SectionCard
            step={section.step}
            title={section.label}
            description={section.description}
            icon={<Warning size={20} weight="bold" className="text-primary" />}
            badge={loans.length > 0 ? <Badge variant="secondary">{loans.length} loan{loans.length === 1 ? "" : "s"}</Badge> : undefined}
        >
            {loans.length === 0 ? (
                <div className="rounded-none border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    Select loan numbers in Step 1.3 to record deviations and remarks.
                </div>
            ) : (
                <PerLoanTabs
                    idPrefix="deviations"
                    ariaLabel="Deviations per loan"
                    mountStrategy="active-only"
                    hasError={(i) => Boolean(formState.errors.loans?.[i]?.deviations)}
                    renderPanel={(loan, i) => <DeviationsFields loanIndex={i} loanNo={loan.loanNo} />}
                />
            )}
        </SectionCard>
    );
}

function DeviationsFields({ loanIndex, loanNo }: { loanIndex: number; loanNo: string }) {
    const {
        control,
        register,
        setValue,
        formState: { errors },
    } = useFormContext<LoanApplicationFormData>();

    const path = `loans.${loanIndex}.deviations` as const;
    const paramsPath = `loans.${loanIndex}.parameters` as const;

    const hasDeviations = useWatch({ control, name: `${path}.hasDeviations` }) ?? false;
    const selected = (useWatch({ control, name: `${path}.deviationDetails` }) as DeviationReason[] | undefined) ?? [];

    // ── Fetch deviation catalog from API ───────────────────────────────
    const { data: catalog, isLoading: catalogLoading } = useDeviationCatalog(hasDeviations);

    // Group catalog items by severity
    const { majorItems, minorItems } = useMemo(() => {
        if (!catalog) return { majorItems: [], minorItems: [] };
        return {
            majorItems: catalog.filter((item) => item.severity === 2),
            minorItems: catalog.filter((item) => item.severity === 1),
        };
    }, [catalog]);

    // Fallback: use hardcoded list if API fails
    const fallbackReasons = DEVIATION_REASONS;

    // ── Detect fee overrides for the conditional justification field ───
    const notarialFee =
        (useWatch({ control, name: `${paramsPath}.notarialFee` }) as number | undefined) ?? 0;
    const docStamps =
        (useWatch({ control, name: `${paramsPath}.docStamps` }) as number | undefined) ?? 0;
    const insurance =
        (useWatch({ control, name: `${paramsPath}.insurance` }) as number | undefined) ?? 0;
    const snapshot = useWatch({
        control,
        name: `${paramsPath}.standardFeesSnapshot`,
    }) as { notarialFee?: number; docStamps?: number; insurance?: number } | undefined;

    const hasFeeOverride = useMemo(() => {
        if (!snapshot) return false;
        return (
            Math.abs(notarialFee - (snapshot.notarialFee ?? 0)) > FEE_OVERRIDE_TOLERANCE ||
            Math.abs(docStamps - (snapshot.docStamps ?? 0)) > FEE_OVERRIDE_TOLERANCE ||
            Math.abs(insurance - (snapshot.insurance ?? 0)) > FEE_OVERRIDE_TOLERANCE
        );
    }, [notarialFee, docStamps, insurance, snapshot]);

    const devErrors = (errors.loans?.[loanIndex]?.deviations as DeviationsErrors | undefined);
    const otherRemarksError = devErrors?.otherRemarks?.message;
    const deviationDetailsError = devErrors?.deviationDetails?.message;
    const feeJustificationError = devErrors?.feeDeviationJustification?.message;
    const justificationErrorFor = (reason: DeviationReason): string | undefined =>
        devErrors?.deviationJustifications?.[reason]?.message;

    const toggleReason = (reason: DeviationReason, checked: boolean) => {
        const next = checked
            ? Array.from(new Set([...selected, reason]))
            : selected.filter((r) => r !== reason);
        setValue(`${path}.deviationDetails`, next, { shouldValidate: true });

        if (!checked) {
            setValue(`${path}.deviationJustifications.${reason}`, "", {
                shouldValidate: false,
            });
        }
    };

    // Count selected deviations by severity
    const selectedMajorCount = selected.filter((r) =>
        majorItems.some((item) => item.description === r)
    ).length;
    const selectedMinorCount = selected.filter((r) =>
        minorItems.some((item) => item.description === r)
    ).length;

    // Render a single deviation checkbox item
    const renderDeviationItem = (reason: string) => {
        const id = `deviation-${loanNo}-${reason}`;
        const checked = selected.includes(reason as DeviationReason);
        const justificationError = justificationErrorFor(reason as DeviationReason);

        return (
            <div key={reason} className="space-y-2">
                <div className="flex items-start gap-2">
                    <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(c) =>
                            toggleReason(reason as DeviationReason, !!c)
                        }
                        className="mt-0.5"
                    />
                    <label
                        htmlFor={id}
                        className="text-sm leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                        {reason}
                    </label>
                </div>

                {checked && (
                    <div
                        key={`${reason}-justification`}
                        className="ml-6 mt-1 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                        <Label
                            htmlFor={`${id}-justification`}
                            className="text-xs text-muted-foreground"
                        >
                            Justification for &quot;{reason}&quot;
                        </Label>
                        <textarea
                            id={`${id}-justification`}
                            {...register(
                                `${path}.deviationJustifications.${reason}`
                            )}
                            placeholder='Explain why this deviation is allowed (e.g., "Borrower is 66 but has strong co-maker and collateral.").'
                            rows={2}
                            aria-invalid={!!justificationError}
                            className={
                                "w-full rounded-md border bg-transparent px-3 py-2 text-sm " +
                                "placeholder:text-muted-foreground focus-visible:border-ring " +
                                "focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y " +
                                (justificationError
                                    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50"
                                    : "border-input")
                            }
                        />
                        {justificationError && (
                            <p
                                role="alert"
                                className="text-xs text-destructive font-medium"
                            >
                                {justificationError}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render a severity group section
    const renderSeverityGroup = (
        title: string,
        severity: "major" | "minor",
        items: DeviationCatalogItemDto[],
        description: string
    ) => {
        const borderColor = severity === "major" ? "border-red-500/30" : "border-amber-500/30";
        const bgColor = severity === "major" ? "bg-red-500/5" : "bg-amber-500/5";
        const headerBg = severity === "major" ? "bg-red-500/10" : "bg-amber-500/10";
        const textColor = severity === "major" ? "text-red-700" : "text-amber-700";
        const badgeVariant = severity === "major" ? "destructive" : "secondary";
        const dotColor = severity === "major" ? "text-red-500" : "text-amber-500";

        return (
            <div className={`rounded-md border ${borderColor} ${bgColor} overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-2.5 ${headerBg} border-b ${borderColor}`}>
                    <div className="flex items-center gap-2">
                        <Circle size={8} weight="fill" className={dotColor} />
                        <span className={`text-sm font-semibold ${textColor}`}>
                            {title}
                        </span>
                        <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">
                            {severity === "major" ? "Major" : "Minor"}
                        </Badge>
                    </div>
                    <span className={`text-xs ${textColor} opacity-80`}>
                        {description}
                    </span>
                </div>
                <div className="p-4 space-y-3">
                    {items.map((item) => renderDeviationItem(item.description))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-5">
            {/* Deviation toggle */}
            <div className="flex items-center space-x-3">
                <Checkbox
                    id={`hasDeviations-${loanNo}`}
                    checked={hasDeviations}
                    onCheckedChange={(checked) =>
                        setValue(`${path}.hasDeviations`, !!checked, {
                            shouldValidate: true,
                        })
                    }
                />
                <label
                    htmlFor={`hasDeviations-${loanNo}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    This application has deviations from standard lending policies
                </label>
            </div>

            {hasDeviations && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                        <Warning size={14} weight="fill" />
                        <span className="font-medium">
                            Select all deviations that apply. Each selected reason requires a written justification for the audit trail.
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                                Deviation Reasons
                            </Label>
                            {deviationDetailsError && (
                                <span className="text-xs text-destructive font-medium">
                                    {deviationDetailsError}
                                </span>
                            )}
                        </div>

                        {catalogLoading ? (
                            <div className="rounded-md border border-input bg-background p-4 text-center text-sm text-muted-foreground">
                                Loading deviation catalog...
                            </div>
                        ) : catalog && catalog.length > 0 ? (
                            <div className="space-y-4">
                                {/* Major Deviations */}
                                {majorItems.length > 0 &&
                                    renderSeverityGroup(
                                        "Major Deviations",
                                        "major",
                                        majorItems,
                                        "Requires COO or higher approval"
                                    )}

                                {/* Minor Deviations */}
                                {minorItems.length > 0 &&
                                    renderSeverityGroup(
                                        "Minor Deviations",
                                        "minor",
                                        minorItems,
                                        "Requires RBG/Product/Credit Head"
                                    )}
                            </div>
                        ) : (
                            /* Fallback: flat list if API returns empty */
                            <div
                                role="group"
                                aria-label="Deviation reasons"
                                className="space-y-3 rounded-md border border-input bg-background p-4"
                            >
                                {fallbackReasons.map((reason) =>
                                    renderDeviationItem(reason)
                                )}
                            </div>
                        )}

                        {selected.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                                <Check size={12} weight="bold" className="text-primary" />
                                <span>
                                    {selected.length} deviation
                                    {selected.length === 1 ? "" : "s"} selected
                                    {selectedMajorCount > 0 && selectedMinorCount > 0 && (
                                        <> ({selectedMajorCount} major, {selectedMinorCount} minor)</>
                                    )}
                                    {selectedMajorCount > 0 && selectedMinorCount === 0 && (
                                        <> (all major)</>
                                    )}
                                    {selectedMajorCount === 0 && selectedMinorCount > 0 && (
                                        <> (all minor)</>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Fee Deviation Justification ───────────────────────────────── */}
            {hasFeeOverride && (
                <div className="rounded-md border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-red-700">
                        <Receipt size={14} weight="fill" />
                        <span className="font-medium">
                            Fee override detected (Major). Justification required.
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                                Fee Deviation Justification
                            </Label>
                            {feeJustificationError && (
                                <span className="text-xs font-medium text-destructive">
                                    {feeJustificationError}
                                </span>
                            )}
                        </div>
                        <textarea
                            {...register(`${path}.feeDeviationJustification`)}
                            placeholder="Why does the actual fee differ from the bank's standard rate? (e.g. 'Notary charged ₱750 because the loan documents were 4 pages instead of the usual 2.')"
                            rows={3}
                            aria-invalid={!!feeJustificationError}
                            className={
                                "w-full rounded-md border bg-transparent px-3 py-2 text-sm " +
                                "placeholder:text-muted-foreground focus-visible:border-ring " +
                                "focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y " +
                                (feeJustificationError
                                    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50"
                                    : "border-input")
                            }
                        />
                    </div>
                </div>
            )}

            {/* Other Remarks */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Other Remarks</Label>
                    {otherRemarksError && (
                        <span className="text-xs text-destructive font-medium">
                            {otherRemarksError}
                        </span>
                    )}
                </div>
                <textarea
                    {...register(`${path}.otherRemarks`)}
                    placeholder="Any other notes or special instructions for this application..."
                    rows={3}
                    aria-invalid={!!otherRemarksError}
                    className={
                        "w-full rounded-md border bg-transparent px-3 py-2 text-sm " +
                        "placeholder:text-muted-foreground focus-visible:border-ring " +
                        "focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y " +
                        (otherRemarksError
                            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50"
                            : "border-input")
                    }
                />
            </div>
        </div>
    );
}
