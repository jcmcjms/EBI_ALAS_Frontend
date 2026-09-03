import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Warning, Check, Receipt } from "@phosphor-icons/react";

import { DEVIATION_REASONS, type DeviationReason } from "../schema";
import { SectionCard } from "./section-card";
import { getSection } from "../sections";

// Typed view of the deviations error subtree returned by RHF's
// errors object. `deviationDetails` is now an array, so its error
// path is `deviations.deviationDetails` (still a single Zod issue
// for the "select at least one" refine).
// `feeDeviationJustification` carries the cross-field issue from the
// root schema's `superRefine` — attached at the same path the Zod
// refine emits (so the AO sees the error under the right field).
type DeviationsErrors = {
    otherRemarks?: { message?: string };
    deviationDetails?: { message?: string };
    feeDeviationJustification?: { message?: string };
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
    const {
        control,
        register,
        setValue,
        formState: { errors },
    } = useFormContext();

    const hasDeviations = useWatch({ control, name: "deviations.hasDeviations" }) ?? false;
    // Read the selected deviation reasons as a string[] for the
    // controlled checkbox group. `?? []` keeps the first render
    // stable before RHF has committed the default value.
    const selected = (useWatch({ control, name: "deviations.deviationDetails" }) as DeviationReason[] | undefined) ?? [];

    // ── Detect fee overrides for the conditional justification field ───
    //
    // The schema's cross-field rule requires `feeDeviationJustification`
    // whenever any of the three fee fields deviates from the standard
    // snapshot by more than `FEE_OVERRIDE_TOLERANCE`. We mirror that
    // check here so the field appears (with an inline warning) at the
    // moment the AO edits one of the fees — *before* they hit Submit
    // and discover the requirement.
    const notarialFee =
        (useWatch({ control, name: "loan.notarialFee" }) as number | undefined) ?? 0;
    const docStamps =
        (useWatch({ control, name: "loan.docStamps" }) as number | undefined) ?? 0;
    const insurance =
        (useWatch({ control, name: "loan.insurance" }) as number | undefined) ?? 0;
    const snapshot = useWatch({
        control,
        name: "loan.standardFeesSnapshot",
    }) as { notarialFee?: number; docStamps?: number; insurance?: number } | undefined;

    const hasFeeOverride = useMemo(() => {
        if (!snapshot) return false;
        return (
            Math.abs(notarialFee - (snapshot.notarialFee ?? 0)) > FEE_OVERRIDE_TOLERANCE ||
            Math.abs(docStamps - (snapshot.docStamps ?? 0)) > FEE_OVERRIDE_TOLERANCE ||
            Math.abs(insurance - (snapshot.insurance ?? 0)) > FEE_OVERRIDE_TOLERANCE
        );
    }, [notarialFee, docStamps, insurance, snapshot]);

    const devErrors = (errors.deviations as DeviationsErrors | undefined);
    const otherRemarksError = devErrors?.otherRemarks?.message;
    const deviationDetailsError = devErrors?.deviationDetails?.message;
    const feeJustificationError = devErrors?.feeDeviationJustification?.message;

    /**
     * Toggle a single deviation reason. We re-write the entire array
     * (rather than calling `setValue` twice for add/remove) so RHF's
     * dirty-tracking and `useFieldArray`-style snapshot updates fire
     * exactly once per click and the approval-form preview sees a
     * single, atomic state change.
     */
    const toggleReason = (reason: DeviationReason, checked: boolean) => {
        const next = checked
            ? Array.from(new Set([...selected, reason]))
            : selected.filter((r) => r !== reason);
        setValue("deviations.deviationDetails", next, { shouldValidate: true });
    };

    const section = getSection("deviations");

    return (
        <SectionCard
            step={section.step}
            title={section.label}
            description={section.description}
            icon={<Warning size={20} weight="bold" className="text-primary" />}
        >
            <div className="space-y-5">
                {/* Deviation toggle */}
                <div className="flex items-center space-x-3">
                    <Checkbox
                        id="hasDeviations"
                        checked={hasDeviations}
                        onCheckedChange={(checked) =>
                            setValue("deviations.hasDeviations", !!checked, {
                                shouldValidate: true,
                            })
                        }
                    />
                    <label
                        htmlFor="hasDeviations"
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
                                Select all deviations that apply. The approval form will list them in the order shown below.
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
                            <div
                                role="group"
                                aria-label="Deviation reasons"
                                className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-input bg-background p-3"
                            >
                                {DEVIATION_REASONS.map((reason) => {
                                    const id = `deviation-${reason}`;
                                    const checked = selected.includes(reason);
                                    return (
                                        <div key={reason} className="flex items-start gap-2">
                                            <Checkbox
                                                id={id}
                                                checked={checked}
                                                onCheckedChange={(c) =>
                                                    toggleReason(reason, !!c)
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
                                    );
                                })}
                            </div>
                            {selected.length > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                                    <Check size={12} weight="bold" className="text-primary" />
                                    <span>
                                        {selected.length} deviation
                                        {selected.length === 1 ? "" : "s"} selected
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Fee Deviation Justification ─────────────────────────────────
                 *
                 * Shown when *any* of the three bank fees (notarial / doc stamps /
                 * insurance) deviates from the `loan.standardFeesSnapshot` by
                 * more than `FEE_OVERRIDE_TOLERANCE`. The Zod root schema
                 * (`loanApplicationSchema.superRefine`) refuses to submit
                 * without a non-empty value here, so the field is mandatory
                 * the moment it appears.
                 *
                 * Why this lives in the Deviations section rather than next to
                 * the fee inputs in Loan Parameters: the printed approval form
                 * groups ALL "policy deviations / remarks" in one section, and
                 * the Approving Officer reviews them together. Putting the
                 * fee justification next to the fees would split the audit
                 * trail across two pages.
                 */}
                {hasFeeOverride && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-amber-700">
                            <Receipt size={14} weight="fill" />
                            <span className="font-medium">
                                Fee override detected. Justification required.
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
                                {...register("deviations.feeDeviationJustification")}
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
                        {...register("deviations.otherRemarks")}
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
        </SectionCard>
    );
}