import { useFormContext } from "react-hook-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
    GraduationCap,
    LockSimple,
    UserCirclePlus,
    WarningCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";
import type { LoanApplicationFormData } from "../schema";

export function PersonalInfoSection() {
    const {
        register,
        formState: { errors },
    } = useFormContext<LoanApplicationFormData>();
    const clientErrors = errors.client;

    /**
     * Returns common props for the manual-entry inputs (School / Referrer):
     *  - aria-invalid when validation has failed
     *  - destructive border + focus ring to match the inline error message
     */
    const getErrorProps = (fieldName: "school" | "referrer") => {
        const error = clientErrors?.[fieldName];
        return {
            "aria-invalid": !!error,
            className: cn("h-9", error && "border-destructive focus-visible:ring-destructive"),
        };
    };

    return (
        <Card>
            <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    2. Personal & Agency Information
                    <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-xs font-normal"
                    >
                        <LockSimple size={12} weight="bold" />
                        System Verified
                    </Badge>
                </CardTitle>
                <CardDescription className="pt-1 text-xs text-muted-foreground">
                    Core borrower details sourced directly from the legacy CIS database. These fields are read-only.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
                {/* ── System Verified Section ─────────────────────────── */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Row 1 — Names */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">First Name</Label>
                        <Input
                            {...register("client.firstName")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50 font-medium"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Middle Name</Label>
                        <Input
                            {...register("client.middleName")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50 font-medium"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Last Name</Label>
                        <Input
                            {...register("client.lastName")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50 font-medium"
                        />
                    </div>

                    {/* Row 2 — Suffix, Birthdate, Employee ID */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Suffix</Label>
                        <Input
                            {...register("client.suffix")}
                            readOnly
                            placeholder="e.g. Jr., Sr., III"
                            className="h-9 cursor-default bg-muted/50"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Birthdate</Label>
                        <Input
                            {...register("client.birthdate")}
                            readOnly
                            type="date"
                            className="h-9 cursor-default bg-muted/50"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Employee #</Label>
                        <Input
                            {...register("client.employeeId")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50 font-mono text-xs"
                        />
                    </div>

                    {/* Row 3 — Address (full width) */}
                    <div className="space-y-1.5 md:col-span-3">
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <Input
                            {...register("client.address")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50"
                        />
                    </div>

                    {/* Row 4 — Agency Type, Position */}
                    <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Agency Type</Label>
                        <Input
                            {...register("client.agency")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50 font-medium"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Position / Title</Label>
                        <Input
                            {...register("client.position")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50"
                        />
                    </div>

                    {/* Row 5 — MIS Agency, Length of Service, NTHP */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">MIS Agency</Label>
                        <Input
                            {...register("client.misAgency")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Length of Service</Label>
                        <Input
                            {...register("client.lengthOfService")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                            Net Take Home Pay (NTHP)
                        </Label>
                        <Input
                            {...register("client.netTakeHomePay")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50 font-bold text-emerald-600"
                        />
                    </div>

                    {/* Row 6 — Region, Division Code, Station Code */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Region</Label>
                        <Input
                            {...register("client.region")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Division Code</Label>
                        <Input
                            {...register("client.divisionCode")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50 font-mono text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Station Code</Label>
                        <Input
                            {...register("client.stationCode")}
                            readOnly
                            className="h-9 cursor-default bg-muted/50 font-mono text-xs"
                        />
                    </div>
                </div>

                {/* ── Divider & Manual Entry Section ──────────────────── */}
                <div className="border-t pt-6">
                    <div className="mb-4 flex items-center gap-2">
                        <GraduationCap size={20} weight="bold" className="text-primary" />
                        <h3 className="text-md font-semibold">
                            Additional Information (Manual Entry)
                        </h3>
                    </div>
                    <p className="mb-6 text-xs text-muted-foreground">
                        Details not present in the core banking system. Please verify with the
                        borrower.
                    </p>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* School Field */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="client.school"
                                className="flex items-center gap-1.5 text-xs"
                            >
                                <GraduationCap size={14} weight="bold" />
                                Educational Attainment / School
                            </Label>
                            <Input
                                id="client.school"
                                {...register("client.school")}
                                placeholder="e.g. University of the Philippines"
                                {...getErrorProps("school")}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Highest level of education or graduating institution.
                            </p>
                            {clientErrors?.school?.message && (
                                <p
                                    className="flex items-center gap-1 text-xs font-medium text-destructive"
                                    role="alert"
                                >
                                    <WarningCircle size={12} weight="fill" />
                                    {clientErrors.school.message}
                                </p>
                            )}
                        </div>

                        {/* Referrer Field */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="client.referrer"
                                className="flex items-center gap-1.5 text-xs"
                            >
                                <UserCirclePlus size={14} weight="bold" />
                                Referrer / Marketing Source
                            </Label>
                            <Input
                                id="client.referrer"
                                {...register("client.referrer")}
                                placeholder="e.g. Employee Referral, Walk-in, Agent Name"
                                {...getErrorProps("referrer")}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Name of the person or campaign that referred the borrower.
                            </p>
                            {clientErrors?.referrer?.message && (
                                <p
                                    className="flex items-center gap-1 text-xs font-medium text-destructive"
                                    role="alert"
                                >
                                    <WarningCircle size={12} weight="fill" />
                                    {clientErrors.referrer.message}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
