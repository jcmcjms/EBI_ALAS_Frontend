import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";
import { MagnifyingGlass, IdentificationCard, CheckCircle, WarningCircle, LockSimple } from "@phosphor-icons/react";
import { Badge } from "@/src/components/ui/badge";
import { getErrorMessage } from "@/src/lib/apiClient";
import { getWebLoanByCis } from "@/src/lib/api/webloans";
import { WEBLOAN_BRANCHES, type WebLoanBorrower } from "@/src/lib/api/types";

/** Formats an ISO datetime as yyyy-MM-dd for <input type="date"> fields. */
function toDateInput(iso?: string | null): string {
    return iso ? iso.slice(0, 10) : "";
}

/** Null-safe numeric coercion for decimal fields coming from the API. */
function toNumber(value?: number | null): number {
    return typeof value === "number" ? value : 0;
}

/** Reads the HTTP status off an unknown error (axios errors carry .response.status). */
function errorStatus(error: unknown): number | undefined {
    return (error as { response?: { status?: number } } | null)?.response?.status;
}

type Feedback = { tone: "success" | "warning" | "error"; message: string };

export function CISLookup() {
    const { setValue, register } = useFormContext();
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    const handleLookup = async () => {
        const query = searchQuery.trim();
        if (!query || isLoading) return;

        setIsLoading(true);
        setFeedback(null);

        try {
            const borrower = await getWebLoanByCis(query);
            applyBorrower(borrower, query);

            const fullName = [
                borrower.personalInformation.firstName,
                borrower.personalInformation.lastName,
            ].filter(Boolean).join(" ");

            setFeedback({
                tone: "success",
                message: `Client profile loaded${fullName ? ` — ${fullName}` : ""}.`,
            });
            toast.success("Client profile loaded successfully.");
        } catch (error) {
            const message = getErrorMessage(error);
            setFeedback({
                tone: errorStatus(error) === 404 ? "warning" : "error",
                message,
            });
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    /** Maps the GET /api/webloans/cis/{cisNo} payload onto the loan application form. */
    const applyBorrower = (borrower: WebLoanBorrower, query: string) => {
        const b = borrower.branchAndType;
        const p = borrower.personalInformation;
        const li = borrower.loanInformation;

        // Branch & Type — system-verified values from the webloan record.
        // Branch is stored/displayed by NAME (resolved from the WEBLOAN_BRANCHES
        // snapshot); an unknown code falls back to the raw code so nothing renders blank.
        const branchName = b.branchCode
            ? WEBLOAN_BRANCHES.find((x) => x.code === b.branchCode)?.name ?? b.branchCode
            : "";
        setValue("branchType.loanType", b.type ?? "");
        setValue("branchType.branch", branchName);
        // Backend returns all acct_no entries owned by the client.
        setValue("branchType.lai", (b.lai ?? []).join(", "));

        // Personal & Agency Information (cis_info)
        setValue("client.cisId", b.cisNo || query);
        setValue("client.firstName", p.firstName ?? "");
        setValue("client.middleName", p.middleName ?? "");
        setValue("client.lastName", p.lastName ?? "");
        setValue("client.suffix", p.suffix ?? "");
        setValue("client.birthdate", toDateInput(p.birthdate));
        setValue("client.address", p.address ?? "");
        setValue("client.agency", p.agencyName ?? "");
        setValue("client.position", p.positionTitle ?? "");
        setValue("client.employeeId", p.employeeNo ?? "");
        setValue("client.region", p.regionCode ?? "");
        setValue("client.divisionCode", p.divisionCode ?? "");
        setValue("client.stationCode", p.stationCode ?? "");
        setValue("client.misAgency", p.misAgency ?? "");
        // lengthOfService & netTakeHomePay are not stored in webloan — left to ALAS.

        // Loan Information — prefill from the borrower's most recent active loan.
        setValue("loan.purpose", li.purpose ?? "");
        setValue("loan.proposedAmount", toNumber(li.proposedAmount));
        setValue("loan.term", toNumber(li.termMonths));
        setValue("loan.interestRate", toNumber(li.interestRate));

        // Outstanding loans table
        setValue(
            "outstandingLoans",
            (borrower.outstandingLoans ?? []).map((o) => ({
                pn: o.pn,
                principalBalance: toNumber(o.principalBalance),
                amortization: toNumber(o.amortization),
                outstandingBalance: toNumber(o.outstandingBalance),
                dateGranted: toDateInput(o.dateGranted),
                dateMaturity: toDateInput(o.dateMaturity),
                status: o.status ?? "Active",
            }))
        );

        // EBI accounts for reloans ("pay to close" is an officer decision — default false).
        setValue(
            "ebiReloans",
            (borrower.ebiReloanAccounts ?? []).map((r) => ({
                pn: r.pn,
                name: r.name ?? "",
                existingDeduction: toNumber(r.existingDeductions),
                payToClose: false,
            }))
        );

        // Buy-outs from other financial institutions
        setValue(
            "buyOuts",
            (borrower.buyOutAccounts ?? []).map((x) => ({
                pn: x.pn,
                name: x.name ?? "",
                amortization: toNumber(x.amortization),
                outstandingBalance: toNumber(x.outstandingBalance),
            }))
        );

        // Incoming / undeducted loans
        setValue(
            "incomingLoans",
            (borrower.incomingLoans ?? []).map((i) => ({
                name: i.name ?? "",
                deductions: toNumber(i.deductions),
                remarks: i.remarks ?? "",
            }))
        );
    };

    const feedbackStyles = feedback?.tone === "success"
        ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
        : feedback?.tone === "warning"
            ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
            : "text-red-600 bg-red-500/10 border-red-500/20";

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                    <IdentificationCard size={20} weight="bold" className="text-primary" />
                    1. Client Lookup (CIS Number)
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                {/* CIS Search */}
                <div className="flex gap-3 max-w-md">
                    <div className="relative flex-1">
                        <MagnifyingGlass size={16} className="absolute left-3 top-3 text-muted-foreground" weight="bold" />
                        <Input
                            placeholder="Enter CIS Number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 font-mono"
                            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                        />
                    </div>
                    <Button onClick={handleLookup} disabled={isLoading || !searchQuery.trim()} className="h-10 px-6">
                        {isLoading ? "Fetching..." : "Fetch Profile"}
                    </Button>
                </div>

                {feedback && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-md border ${feedbackStyles}`}>
                        {feedback.tone === "success"
                            ? <CheckCircle size={16} weight="fill" />
                            : <WarningCircle size={16} weight="fill" />}
                        <span className="font-medium">{feedback.message}</span>
                    </div>
                )}

                {/* Branch & Type Section */}
                <div className="rounded-md border bg-muted/20 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Branch & Type
                        </h4>
                        <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
                            <LockSimple size={12} weight="bold" /> System Verified
                        </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Loan Type</Label>
                            <Input
                                {...register("branchType.loanType")}
                                readOnly
                                placeholder="Auto-filled from CIS"
                                className="h-9 bg-muted/50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Branch</Label>
                            <Input
                                {...register("branchType.branch")}
                                readOnly
                                placeholder="Auto-filled from CIS"
                                className="h-9 bg-muted/50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Requesting Officer</Label>
                            <Input
                                {...register("branchType.requestingOfficer")}
                                placeholder="Officer name"
                                readOnly
                                className="h-9 bg-muted/50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">LAI (Loan Application Index)</Label>
                            <Input
                                {...register("branchType.lai")}
                                placeholder="LAI number"
                                readOnly
                                className="h-9 font-mono bg-muted/50"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
