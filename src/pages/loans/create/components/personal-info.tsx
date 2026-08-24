import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LockSimple } from "@phosphor-icons/react";
import {Badge} from "@/components/ui/badge.tsx";

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
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">First Name</Label>
                    <Input {...register("client.firstName")} readOnly className="bg-muted/50 h-9 font-medium" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Last Name</Label>
                    <Input {...register("client.lastName")} readOnly className="bg-muted/50 h-9 font-medium" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Employee ID</Label>
                    <Input {...register("client.employeeId")} readOnly className="bg-muted/50 h-9 font-mono text-xs" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Agency / Department</Label>
                    <Input {...register("client.agency")} readOnly className="bg-muted/50 h-9 font-medium" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Position / Title</Label>
                    <Input {...register("client.position")} readOnly className="bg-muted/50 h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Net Take Home Pay (NTHP)</Label>
                    <Input
                        {...register("client.netTakeHomePay")}
                        readOnly
                        className="bg-muted/50 h-9 font-bold text-emerald-600"
                        prefix="₱"
                    />
                </div>
            </CardContent>
        </Card>
    );
}