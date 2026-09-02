import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { CheckCircle } from "@phosphor-icons/react";

export function VerificationSection() {
    const { register, formState: { errors } } = useFormContext();

    const findingsError = (
        errors.verification as { findings?: { message?: string } } | undefined
    )?.findings?.message;

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle size={20} weight="bold" className="text-primary" />
                    6. Verification Conducted
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Findings / Notes</Label>
                        {findingsError && (
                            <span className="text-xs text-destructive font-medium">
                                {findingsError}
                            </span>
                        )}
                    </div>
                    <textarea
                        {...register("verification.findings")}
                        placeholder="Document any findings from verification (e.g., employment confirmed, payslip validated, collateral inspected)..."
                        rows={3}
                        aria-invalid={!!findingsError}
                        className={
                            "w-full rounded-md border bg-transparent px-3 py-2 text-sm " +
                            "placeholder:text-muted-foreground focus-visible:border-ring " +
                            "focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y " +
                            (findingsError
                                ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50"
                                : "border-input")
                        }
                    />
                </div>
            </CardContent>
        </Card>
    );
}
