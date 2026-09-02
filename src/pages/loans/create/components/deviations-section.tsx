import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Warning } from "@phosphor-icons/react";

// Typed view of the deviations error subtree returned by RHF's errors object.
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

    const devErrors = (errors.deviations as DeviationsErrors | undefined);
    const otherRemarksError = devErrors?.otherRemarks?.message;
    const deviationDetailsError = devErrors?.deviationDetails?.message;

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
                                Deviation details will be reviewed by the Checking Officer and Approving Authority.
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground">
                                    Deviation Details / Justification
                                </Label>
                                {deviationDetailsError && (
                                    <span className="text-xs text-destructive font-medium">
                                        {deviationDetailsError}
                                    </span>
                                )}
                            </div>
                            <textarea
                                {...register("deviations.deviationDetails")}
                                placeholder="Describe the deviation and provide justification (e.g. exceeds standard NTHP ratio, borrower has existing delinquency, etc.)"
                                rows={4}
                                aria-invalid={!!deviationDetailsError}
                                className={
                                    "w-full rounded-md border bg-transparent px-3 py-2 text-sm " +
                                    "placeholder:text-muted-foreground focus-visible:border-ring " +
                                    "focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y " +
                                    (deviationDetailsError
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
            </CardContent>
        </Card>
    );
}
