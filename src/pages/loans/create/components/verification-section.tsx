import { useFormContext } from "react-hook-form";
import { Label } from "@/src/components/ui/label";
import { CheckCircle } from "@phosphor-icons/react";

import { SectionCard } from "./section-card";
import { getSection } from "../sections";

export function VerificationSection() {
    const { register, formState: { errors } } = useFormContext();

    const findingsError = (
        errors.verification as { findings?: { message?: string } } | undefined
    )?.findings?.message;

    const section = getSection("verification");

    return (
        <SectionCard
            step={section.step}
            title={section.label}
            description={section.description}
            icon={<CheckCircle size={20} weight="bold" className="text-primary" />}
        >
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
        </SectionCard>
    );
}