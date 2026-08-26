import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { LockSimple } from "@phosphor-icons/react";
import { Badge } from "@/src/components/ui/badge";

export function PersonalInfoSection() {
    const { register } = useFormContext();

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                    2. Personal & Agency Information
                    <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
                        <LockSimple size={12} weight="bold" /> System Verified
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Row 1 — Names */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">First Name</Label>
                    <Input {...register("client.firstName")} readOnly className="bg-muted/50 h-9 font-medium" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Middle Name</Label>
                    <Input {...register("client.middleName")} readOnly className="bg-muted/50 h-9 font-medium" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Last Name</Label>
                    <Input {...register("client.lastName")} readOnly className="bg-muted/50 h-9 font-medium" />
                </div>

                {/* Row 2 — Suffix, Birthdate, Employee ID */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Suffix</Label>
                    <Input {...register("client.suffix")} readOnly placeholder="e.g. Jr., Sr., III" className="bg-muted/50 h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Birthdate</Label>
                    <Input {...register("client.birthdate")} readOnly type="date" className="bg-muted/50 h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Employee #</Label>
                    <Input {...register("client.employeeId")} readOnly className="bg-muted/50 h-9 font-mono text-xs" />
                </div>

                {/* Row 3 — Address (full width) */}
                <div className="space-y-1.5 md:col-span-3">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <Input {...register("client.address")} readOnly className="bg-muted/50 h-9" />
                </div>

                {/* Row 4 — Agency, Position, NTHP */}
                <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Agency / Department</Label>
                    <Input {...register("client.agency")} readOnly className="bg-muted/50 h-9 font-medium" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Position / Title</Label>
                    <Input {...register("client.position")} readOnly className="bg-muted/50 h-9" />
                </div>

                {/* Row 5 — MIS Agency, Length of Service, NTHP */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">MIS Agency</Label>
                    <Input {...register("client.misAgency")} readOnly className="bg-muted/50 h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Length of Service</Label>
                    <Input {...register("client.lengthOfService")} readOnly className="bg-muted/50 h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Net Take Home Pay (NTHP)</Label>
                    <Input
                        {...register("client.netTakeHomePay")}
                        readOnly
                        className="bg-muted/50 h-9 font-bold text-emerald-600"
                    />
                </div>

                {/* Row 6 — Region, Division Code, Station Code */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Region</Label>
                    <Input {...register("client.region")} readOnly className="bg-muted/50 h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Division Code</Label>
                    <Input {...register("client.divisionCode")} readOnly className="bg-muted/50 h-9 font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Station Code</Label>
                    <Input {...register("client.stationCode")} readOnly className="bg-muted/50 h-9 font-mono text-xs" />
                </div>
            </CardContent>
        </Card>
    );
}
