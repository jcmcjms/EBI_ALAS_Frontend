import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/src/components/ui/select";
import { MagnifyingGlass, IdentificationCard, CheckCircle } from "@phosphor-icons/react";

const loanTypes = [
    "Regular Loan",
    "Reloan",
    "Restructure",
    "Takeout",
];

const branches = [
    "Main Office",
    "Davao Branch",
    "GenSan Branch",
    "Tagum Branch",
    "Digos Branch",
    "Cotabato Branch",
    "Kidapawan Branch",
];

export function CISLookup() {
    const { setValue, watch, register } = useFormContext();
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFound, setIsFound] = useState(false);

    const handleLookup = async () => {
        if (!searchQuery) return;
        setIsLoading(true);

        // Simulate API call to .NET backend
        await new Promise(r => setTimeout(r, 800));

        // Populate form with fetched data
        setValue("client.cisId", searchQuery);
        setValue("client.firstName", "Maria");
        setValue("client.middleName", "Garcia");
        setValue("client.lastName", "Santos");
        setValue("client.suffix", "");
        setValue("client.birthdate", "1985-06-15");
        setValue("client.address", "Poblacion, Digos City, Davao del Sur");
        setValue("client.agency", "DepEd - Division of Davao del Sur");
        setValue("client.position", "Public School District Supervisor");
        setValue("client.employeeId", "EMP-10042");
        setValue("client.netTakeHomePay", 45000);
        setValue("client.lengthOfService", "8 years");
        setValue("client.region", "Region XI");
        setValue("client.divisionCode", "DIV-XI-001");
        setValue("client.stationCode", "STN-DGO-042");
        setValue("client.misAgency", "DepEd Davao del Sur");

        // Populate existing loans
        setValue("outstandingLoans", [
            { pn: "PN-2023-001", principalBalance: 50000, amortization: 2500, outstandingBalance: 35000, dateGranted: "2023-03-15", dateMaturity: "2025-03-15", status: "Active" },
            { pn: "PN-2024-088", principalBalance: 15000, amortization: 1200, outstandingBalance: 12500, dateGranted: "2024-01-10", dateMaturity: "2026-01-10", status: "Active" },
        ]);

        setIsFound(true);
        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                    <IdentificationCard size={20} weight="bold" className="text-primary" />
                    1. Client Lookup (CIS / Employee ID)
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                {/* CIS Search */}
                <div className="flex gap-3 max-w-md">
                    <div className="relative flex-1">
                        <MagnifyingGlass size={16} className="absolute left-3 top-3 text-muted-foreground" weight="bold" />
                        <Input
                            placeholder="Enter CIS Number or Employee ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 font-mono"
                            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                        />
                    </div>
                    <Button onClick={handleLookup} disabled={isLoading} className="h-10 px-6">
                        {isLoading ? "Fetching..." : "Fetch Profile"}
                    </Button>
                </div>

                {isFound && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 p-3 rounded-md border border-emerald-500/20">
                        <CheckCircle size={16} weight="fill" />
                        <span className="font-medium">Client profile loaded successfully.</span>
                    </div>
                )}

                {/* Branch & Type Section */}
                <div className="rounded-md border bg-muted/20 p-4 space-y-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Branch & Type
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Loan Type</Label>
                            <Select
                                value={watch("branchType.loanType") ?? ""}
                                onValueChange={(v) => setValue("branchType.loanType", v, { shouldValidate: true })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {loanTypes.map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Branch</Label>
                            <Select
                                value={watch("branchType.branch") ?? ""}
                                onValueChange={(v) => setValue("branchType.branch", v, { shouldValidate: true })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((b) => (
                                        <SelectItem key={b} value={b}>{b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Requesting Officer</Label>
                            <Input
                                {...register("branchType.requestingOfficer")}
                                placeholder="Officer name"
                                className="h-9"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">LAI (Loan Application Index)</Label>
                            <Input
                                {...register("branchType.lai")}
                                placeholder="LAI number"
                                className="h-9 font-mono"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
