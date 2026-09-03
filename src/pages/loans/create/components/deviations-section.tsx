import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Warning, Check } from "@phosphor-icons/react";

import { DEVIATION_REASONS, type DeviationReason } from "../schema";

// Typed view of the deviations error subtree returned by RHF's
// errors object. `deviationDetails` is now an array, so its error
// path is `deviations.deviationDetails` (still a single Zod issue
// for the "select at least one" refine).
type DeviationsErrors = {
    otherRemarks?: { message?: string };
    deviationDetails?: { message?: string };
};

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

    const devErrors = (errors.deviations as DeviationsErrors | undefined);
    const otherRemarksError = devErrors?.otherRemarks?.message;
    const deviationDetailsError = devErrors?.deviationDetails?.message;

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

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Warning size={20} weight="bold" className="text-primary" />
                    7. Remarks & Deviations
                </CardTitle>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
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
            </CardContent>
        </Card>
    );
}