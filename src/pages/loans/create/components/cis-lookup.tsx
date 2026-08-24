import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MagnifyingGlass, IdentificationCard, CheckCircle } from "@phosphor-icons/react";

export function CISLookup() {
    const { setValue } = useFormContext();
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
        setValue("client.lastName", "Santos");
        setValue("client.agency", "DepEd - Division of Davao del Sur");
        setValue("client.position", "Public School District Supervisor");
        setValue("client.employeeId", "EMP-10042");
        setValue("client.netTakeHomePay", 45000);

        // Populate existing loans with outstandingBalance
        setValue("outstandingLoans", [
            { pn: "PN-2023-001", principalBalance: 50000, amortization: 2500, outstandingBalance: 35000, status: "Active", payToClose: false },
            { pn: "PN-2024-088", principalBalance: 15000, amortization: 1200, outstandingBalance: 12500, status: "Active", payToClose: false },
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
            <CardContent className="pt-6">
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
                    <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 p-3 rounded-md border border-emerald-500/20">
                        <CheckCircle size={16} weight="fill" />
                        <span className="font-medium">Client profile loaded successfully. Proceed to Loan Parameters.</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
