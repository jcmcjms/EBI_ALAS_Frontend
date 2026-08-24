import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LockSimple, Bank, UserCircle } from "@phosphor-icons/react";
import { useAuthStore } from "@/store/authStore";

export function ApplicationDetailsSection() {
    const { register, setValue } = useFormContext();
    const user = useAuthStore((state) => state.user);

    // Auto-populate officer and branch on mount
    // In a real app, use useEffect to set these values if they are empty
    const officerName = user?.fullName || "Maria Santos";
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
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <LockSimple size={12} /> Loan Application ID (LAI)
                    </Label>
                    <Input value="LA-2026-08-9942" readOnly className="bg-muted/50 h-9 font-mono text-xs font-bold" />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Loan Type / Category</Label>
                    <Select defaultValue="salary_loan" onValueChange={(val) => setValue("loan.type", val)}>
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="salary_loan">Salary Loan</SelectItem>
                            <SelectItem value="multi_purpose">Multi-Purpose Loan</SelectItem>
                            <SelectItem value="emergency">Emergency Loan</SelectItem>
                        </SelectContent>
                    </Select>
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