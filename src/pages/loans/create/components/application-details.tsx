import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Bank, UserCircle } from "@phosphor-icons/react";
import { useAuthStore } from "@/src/store/authStore";

export function ApplicationDetailsSection() {
    const { register } = useFormContext();
    const user = useAuthStore((state) => state.user);

    // Auto-populate officer and branch on mount
    // In a real app, use useEffect to set these values if they are empty
    const officerName = user ? `${user.firstName} ${user.middleName ? user.middleName + " " : ""}${user.lastName}` : "Maria Santos";
    const branchName = user?.branchId || "Makati Main";

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Bank size={20} weight="bold" className="text-primary" />
                    Application Details & Routing
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Loan Type / Category</Label>
                    <Input
                        {...register("loan.type")}
                        defaultValue="salary_loan"
                        placeholder="e.g. Salary Loan, Multi-Purpose Loan"
                        className="h-9"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Processing Branch</Label>
                    <Input value={branchName} readOnly className="bg-muted/50 h-9 font-medium" />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <UserCircle size={12} /> Requesting Officer / Account Officer
                    </Label>
                    <Input value={officerName} readOnly className="bg-muted/50 h-9 font-medium" />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Application Date</Label>
                    <Input value={new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })} readOnly className="bg-muted/50 h-9" />
                </div>
            </CardContent>
        </Card>
    );
}