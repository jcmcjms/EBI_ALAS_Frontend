import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Warning, Check, Receipt } from "@phosphor-icons/react";

import { DEVIATION_REASONS, type DeviationReason } from "../schema";
import { SectionCard } from "./section-card";
import { getSection } from "../sections";

// Typed view of the deviations error subtree returned by RHF's
// errors object.
//
// `deviationDetails` is the array-level error (the "select at least
// one" refine). `deviationJustifications` is a *record* whose keys
// are the selected `DeviationReason`s — each carries a per-reason
// message emitted by the schema's relational superRefine. Reading
// it as `Record<string, { message?: string }>` lets the UI look up
// a specific reason's error inline without casting at the call site.
//
// `feeDeviationJustification` carries the cross-field issue from the
// root schema's `superRefine` — attached at the same path the Zod
// refine emits (so the AO sees the error under the right field).
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
    // Lookup is keyed by the *exact* `DeviationReason` string the
    // schema emitted in its issue path. RHF stores nested paths as
    // nested objects, so `deviationJustifications?.[reason]?.message`
    // gives us the inline error for that specific row.
    const justificationErrorFor = (reason: DeviationReason): string | undefined =>
        devErrors?.deviationJustifications?.[reason]?.message;

    /**
     * Toggle a single deviation reason. Two responsibilities:
     *
     *  1. Re-write the `deviationDetails` array atomically (so RHF's
     *     dirty-tracking fires once per click and the approval-form
     *     preview sees a single state change).
     *  2. When *un-checking*, prune the matching key from
     *     `deviationJustifications`. The schema allows orphan
     *     justification entries, but a banking-grade audit trail
     *     should not ship a justification for a reason the AO no
     *     longer claims — so the payload stays clean.
     *
     * We deliberately do NOT trigger validation on the uncheck path
     * (the removed key takes its error with it; the user just acted
     * and re-running validation feels punishing).
     */
    const toggleReason = (reason: DeviationReason, checked: boolean) => {
        const next = checked
            ? Array.from(new Set([...selected, reason]))
            : selected.filter((r) => r !== reason);
        setValue("deviations.deviationDetails", next, { shouldValidate: true });

        if (!checked) {
            // Clear the justification value (keeping the record key
            // would re-introduce it on the next check, which is
            // surprising; an empty string is the explicit "AO said
            // nothing for this reason" state).
            setValue(`deviations.deviationJustifications.${reason}`, "", {
                shouldValidate: false,
            });
        }
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

                            {/* UX: vertical stack (space-y-3) instead of a
                                 grid — when a justification textarea expands
                                 below a row, a grid would compress or shift
                                 neighbouring rows. The vertical layout lets
                                 each row's textarea breathe naturally. */}
                            <div
                                role="group"
                                aria-label="Deviation reasons"
                                className="space-y-3 rounded-md border border-input bg-background p-4"
                            >
                                {DEVIATION_REASONS.map((reason) => {
                                    const id = `deviation-${reason}`;
                                    const checked = selected.includes(reason);
                                    const justificationError =
                                        justificationErrorFor(reason);

                                    return (
                                        <div key={reason} className="space-y-2">
                                            <div className="flex items-start gap-2">
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

                                            {/* Progressive disclosure:
                                                 the per-reason justification
                                                 textarea only renders once the
                                                 row is checked, with a soft
                                                 fade/slide-in so the layout
                                                 transition is calm rather than
                                                 jarring. The keyed wrapper
                                                 remounts the textarea on every
                                                 check/uncheck so the entry
                                                 animation fires. */}
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
                                                            `deviations.deviationJustifications.${reason}`
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
                                                    {/* Inline contextual error —
                                                         points the AO directly
                                                         at the offending
                                                         textarea instead of a
                                                         generic top-of-form
                                                         banner. */}
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