import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { CheckCircle } from "@phosphor-icons/react";

export function VerificationSection() {
    const { register } = useFormContext();

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
                    <Label className="text-xs text-muted-foreground">Findings / Notes</Label>
                    <textarea
                        {...register("verification.findings")}
                        placeholder="Document any findings from verification (e.g., employment confirmed, payslip validated, collateral inspected)..."
                        rows={3}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
