import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Warning } from "@phosphor-icons/react";

export function DeviationsSection() {
    const { control, register, setValue } = useFormContext();

    const hasDeviations = useWatch({ control, name: "deviations.hasDeviations" }) ?? false;

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
                            <Label className="text-xs text-muted-foreground">
                                Deviation Details / Justification
                            </Label>
                            <textarea
                                {...register("deviations.deviationDetails")}
                                placeholder="Describe the deviation and provide justification (e.g. exceeds standard NTHP ratio, borrower has existing delinquency, etc.)"
                                rows={4}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y"
                            />
                        </div>
                    </div>
                )}

                {/* AO Recommendation */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                        Account Officer Recommendation
                    </Label>
                    <textarea
                        {...register("deviations.aoRecommendation")}
                        placeholder="Your professional recommendation regarding this loan application..."
                        rows={3}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y"
                    />
                </div>

                {/* Other Remarks */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Other Remarks</Label>
                    <textarea
                        {...register("deviations.otherRemarks")}
                        placeholder="Any other notes or special instructions for this application..."
                        rows={3}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y"
                    />
                </div>

                {/* General Remarks */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Additional Remarks</Label>
                    <Input
                        {...register("deviations.remarks")}
                        placeholder="Any other notes for this application..."
                        className="h-9"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
