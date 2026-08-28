import { forwardRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  FilePdf,
  Printer,
} from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { cn } from "@/src/lib/utils";

import type { LoanApplicationFormData, ClientFormData } from "../schema";

function formatPhp(value?: number | string): string {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (typeof num !== "number" || Number.isNaN(num)) return "—";
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
}

function formatDate(iso?: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "2-digit",
    });
}

function fullNameOf(client: Partial<ClientFormData>): string {
    const lastName = client.lastName || "";
    const middleName = client.middleName || "";
    const firstName = client.firstName || "";
    const parts = [lastName, middleName ? `${middleName[0]}.` : "", firstName].filter(Boolean);
    return parts.length > 1 ? `${parts[0]}, ${parts.slice(1).join(" ")}` : parts[0] || "—";
}

function ageFrom(isoDate: string): string {
    const birth = new Date(isoDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return String(age);
}

/**
 * Computes loan computations from the form state.
 * TODO(api): this must match the .NET 8 computation engine exactly —
 * rates, charges, DTI thresholds belong in the backend; this is a preview only.
 */
function useLoanComputations(data: LoanApplicationFormData) {
    const { loan, outstandingLoans, ebiReloans, buyOuts, incomingLoans, client } = data;

    const existingObligationsTotal = outstandingLoans.reduce((s, l) => s + (l.outstandingBalance || 0), 0);
    const ebiReloansTotal = ebiReloans.reduce((s, r) => s + (r.existingDeduction || 0), 0);
    const buyOutTotal = buyOuts.reduce((s, b) => s + (b.outstandingBalance || 0), 0);
    const incomingTotal = incomingLoans.reduce((s, i) => s + (i.deductions || 0), 0);

    // Simplified preview math — backend is authoritative.
    const termDays = (loan.term || 0) * 30;
    const annualRate = loan.interestRate || 0;
    const monthlyRate = annualRate / 100 / 12;
    const months = loan.term || 0;
    const amortization =
        months > 0 && monthlyRate > 0
            ? (loan.proposedAmount * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
              (Math.pow(1 + monthlyRate, months) - 1)
            : 0;

    const applicationCharge = loan.proposedAmount * 0.05; // 5% preview
    const docStamp = loan.proposedAmount * 0.015;
    const notarialFee = 500;
    const totalDeductions = applicationCharge + docStamp + notarialFee;
    const grossProceeds = loan.proposedAmount - totalDeductions;
    const netToClient = grossProceeds - existingObligationsTotal - buyOutTotal;
    const totalExposure = loan.proposedAmount + existingObligationsTotal + buyOutTotal;

    return {
        termDays,
        amortization,
        applicationCharge,
        docStamp,
        notarialFee,
        totalDeductions,
        grossProceeds,
        netToClient,
        totalExposure,
        existingObligationsTotal,
        ebiReloansTotal,
        buyOutTotal,
        incomingTotal,
        netTakeHomePay: client.netTakeHomePay || 0,
    };
}

export const ApprovalFormPreview = forwardRef<HTMLDivElement, { onGeneratePdf: () => void }>(
    ({ onGeneratePdf }, ref) => {
        const { control } = useFormContext<LoanApplicationFormData>();
        const form = useWatch({ control });
        const client = form?.client ?? ({} as LoanApplicationFormData["client"]);
        const branchType = form?.branchType ?? ({} as LoanApplicationFormData["branchType"]);
        const loan = form?.loan ?? ({} as LoanApplicationFormData["loan"]);
        const verification = form?.verification;
        const deviations = form?.deviations;

        const comp = useLoanComputations(form as LoanApplicationFormData);

        const hasOutstanding = (form?.outstandingLoans ?? []).length > 0;
        const hasEbiReloans = (form?.ebiReloans ?? []).length > 0;
        const hasBuyOuts = (form?.buyOuts ?? []).length > 0;
        const hasIncoming = (form?.incomingLoans ?? []).length > 0;

        return (
            <Card>
                <CardHeader className="flex-row items-center justify-between border-b bg-muted/30">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FilePdf size={20} weight="bold" className="text-primary" />
                        Approval Form Preview
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                            <Printer size={14} weight="bold" />
                            Print
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={onGeneratePdf}>
                            <FilePdf size={14} weight="bold" />
                            Generate PDF
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Printable / PDF-able area. This ref is what html2canvas captures. */}
                    <div
                        ref={ref}
                        id="approval-form-preview"
                        className="space-y-5 bg-background p-6 font-[Geist] text-[11px] leading-snug text-foreground"
                    >
                        {/* Header */}
                        <div className="border-b-2 border-foreground pb-2 text-center">
                            <h1 className="text-sm font-bold tracking-wide">LOAN APPROVAL FORM</h1>
                            <p className="text-[10px] text-muted-foreground">Enterprise Bank — ALAS</p>
                        </div>

                        {/* CLIENT INFORMATION */}
                        <section>
                            <div className="mb-2 bg-foreground py-1 text-center text-[10px] font-bold uppercase tracking-wider text-background">
                                Client Information
                            </div>
                            <div className="grid grid-cols-4 gap-x-4 gap-y-1">
                                <Field label="School Type" value={branchType.loanType || "—"} />
                                <Field label="Client Name" value={fullNameOf(client)} span={3} />
                                <Field label="Position / Title" value={client.position ?? "—"} />
                                <Field label="Address" value={client.address ?? "—"} span={3} />
                                <Field label="Age" value={client.birthdate ? ageFrom(client.birthdate) : "—"} />
                                <Field label="Length of Service" value={client.lengthOfService ?? "—"} />
                                <Field label="Loan Application Type" value={branchType.loanType || "—"} />
                                <Field label="LAM ID" value={branchType.lai || "—"} />
                                <Field label="Region Code" value={client.region ?? "—"} />
                                <Field label="Division Code" value={client.divisionCode ?? "—"} />
                                <Field label="Employee No." value={client.employeeId ?? "—"} />
                                <Field label="Branch" value={branchType.branch || "—"} />
                                <Field label="PN" value="—" />
                                <Field label="Requesting Officer" value={branchType.requestingOfficer || "—"} span={2} />
                                <Field label="Processing Date" value={formatDate(new Date().toISOString())} />
                                <Field label="Loan Product" value={loan.product || "—"} />
                                <Field label="Term (Days)" value={comp.termDays.toLocaleString()} />
                                <Field label="Loan Purpose" value={loan.purpose || "—"} span={2} />
                            </div>
                        </section>

                        {/* LOAN COMPUTATIONS */}
                        <section>
                            <div className="mb-2 bg-foreground py-1 text-center text-[10px] font-bold uppercase tracking-wider text-background">
                                Loan Computations
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* LEFT: amounts */}
                                <div className="space-y-1.5">
                                    <Row label="Maximum Loanable Amount" value={formatPhp(loan.proposedAmount)} />
                                    <Row label="Proposed Loan for Approval" value={formatPhp(loan.proposedAmount)} bold />
                                    <div className="mt-2 text-[10px] font-semibold text-muted-foreground">Outstanding Loans</div>
                                    <Table className="text-[10px]">
                                        <TableHeader>
                                            <TableRow className="h-6 border-b">
                                                <TableHead className="h-6 px-1 py-0">PN</TableHead>
                                                <TableHead className="h-6 px-1 py-0 text-right">Balance</TableHead>
                                                <TableHead className="h-6 px-1 py-0 text-right">Principal</TableHead>
                                                <TableHead className="h-6 px-1 py-0">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!hasOutstanding && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-8 px-1 py-1 text-center text-muted-foreground">
                                                        No outstanding loans
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {(form?.outstandingLoans ?? []).map((loanItem) => (
                                                <TableRow key={loanItem.pn} className="h-6 border-b">
                                                    <TableCell className="h-6 px-1 py-0 font-mono">{loanItem.pn}</TableCell>
                                                    <TableCell className="h-6 px-1 py-0 text-right tabular-nums">{formatPhp(loanItem.outstandingBalance)}</TableCell>
                                                    <TableCell className="h-6 px-1 py-0 text-right tabular-nums">{formatPhp(loanItem.principalBalance)}</TableCell>
                                                    <TableCell className="h-6 px-1 py-0">{loanItem.status}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    <div className="mt-2 space-y-0.5 border-t pt-1.5">
                                        <Row label="Application Charge" value={formatPhp(comp.applicationCharge)} />
                                        <Row label="Doc. Stamp" value={formatPhp(comp.docStamp)} />
                                        <Row label="Notarial Fee" value={formatPhp(comp.notarialFee)} />
                                        <Row label="Total Deductions" value={formatPhp(comp.totalDeductions)} />
                                    </div>
                                    <div className="space-y-0.5 border-t pt-1.5">
                                        <Row label="Gross Proceeds" value={formatPhp(comp.grossProceeds)} />
                                        <Row label="Less: Total Accounts Balance" value={formatPhp(comp.existingObligationsTotal + comp.buyOutTotal)} />
                                        <Row label="Net Proceeds to Client" value={formatPhp(comp.netToClient)} bold />
                                        <Row label="Total Exposure" value={formatPhp(comp.totalExposure)} />
                                    </div>
                                </div>

                                {/* RIGHT: amortization & deductions */}
                                <div className="space-y-1.5">
                                    <Row label="Monthly Amortization" value={formatPhp(comp.amortization)} bold />
                                    <Row label="Net Pay After Deduction" value={formatPhp(comp.netTakeHomePay - comp.amortization)} />
                                    <Row label={`Net Take Home Pay as of ${formatDate(new Date().toISOString())}`} value={formatPhp(comp.netTakeHomePay)} />
                                    <Row label="Other Income" value="—" />
                                    <Row label="Total Monthly Income" value={formatPhp(comp.netTakeHomePay)} />

                                    <div className="mt-2 text-[10px] font-semibold text-muted-foreground">EBI Accounts for Reloans</div>
                                    <Table className="text-[10px]">
                                        <TableHeader>
                                            <TableRow className="h-6 border-b">
                                                <TableHead className="h-6 px-1 py-0">Name / PN</TableHead>
                                                <TableHead className="h-6 px-1 py-0 text-right">Deduction</TableHead>
                                                <TableHead className="h-6 px-1 py-0 text-right">Balance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!hasEbiReloans && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-8 px-1 py-1 text-center text-muted-foreground">
                                                        No EBI reloans
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {(form?.ebiReloans ?? []).map((r) => (
                                                <TableRow key={r.pn} className="h-6 border-b">
                                                    <TableCell className="h-6 px-1 py-0">{r.name || r.pn}</TableCell>
                                                    <TableCell className="h-6 px-1 py-0 text-right tabular-nums">{formatPhp(r.existingDeduction)}</TableCell>
                                                    <TableCell className="h-6 px-1 py-0 text-right tabular-nums">—</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    <div className="mt-2 text-[10px] font-semibold text-muted-foreground">Buy-Out Accounts</div>
                                    <Table className="text-[10px]">
                                        <TableHeader>
                                            <TableRow className="h-6 border-b">
                                                <TableHead className="h-6 px-1 py-0">Institution / PN</TableHead>
                                                <TableHead className="h-6 px-1 py-0 text-right">Amortization</TableHead>
                                                <TableHead className="h-6 px-1 py-0 text-right">Balance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!hasBuyOuts && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-8 px-1 py-1 text-center text-muted-foreground">
                                                        No buy-out accounts
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {(form?.buyOuts ?? []).map((b) => (
                                                <TableRow key={b.pn} className="h-6 border-b">
                                                    <TableCell className="h-6 px-1 py-0">{b.name || b.pn}</TableCell>
                                                    <TableCell className="h-6 px-1 py-0 text-right tabular-nums">{formatPhp(b.amortization)}</TableCell>
                                                    <TableCell className="h-6 px-1 py-0 text-right tabular-nums">{formatPhp(b.outstandingBalance)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    <div className="mt-2 space-y-0.5 border-t pt-1.5">
                                        <Row label="Incoming / Undeducted Loans" value={hasIncoming ? "See below" : "—"} />
                                        <Row label="Total Deductions" value={formatPhp(comp.ebiReloansTotal + comp.buyOutTotal + comp.incomingTotal)} />
                                        <Row label="Total Disposable" value={formatPhp(comp.netTakeHomePay - comp.amortization)} />
                                        <Row label="Maximum Loanable Amount" value={formatPhp(loan.proposedAmount)} bold />
                                    </div>
                                </div>
                            </div>

                            {/* Incoming / remarks sub-section */}
                            {(hasIncoming || deviations?.remarks) && (
                                <div className="mt-3 border-t pt-2">
                                    {hasIncoming && (
                                        <>
                                            <div className="mb-1 text-[10px] font-semibold text-muted-foreground">
                                                Incoming / Undeducted Loans
                                            </div>
                                            <Table className="text-[10px]">
                                                <TableHeader>
                                                    <TableRow className="h-6 border-b">
                                                        <TableHead className="h-6 px-1 py-0">Name</TableHead>
                                                        <TableHead className="h-6 px-1 py-0 text-right">Deduction</TableHead>
                                                        <TableHead className="h-6 px-1 py-0">Remarks</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(form?.incomingLoans ?? []).map((i, idx) => (
                                                        <TableRow key={idx} className="h-6 border-b">
                                                            <TableCell className="h-6 px-1 py-0">{i.name}</TableCell>
                                                            <TableCell className="h-6 px-1 py-0 text-right tabular-nums">{formatPhp(i.deductions)}</TableCell>
                                                            <TableCell className="h-6 px-1 py-0">{i.remarks}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </>
                                    )}
                                    {deviations?.remarks && (
                                        <div className="mt-2 text-[10px]">
                                            <span className="font-semibold">Remarks: </span>
                                            {deviations.remarks}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* DEVIATIONS & VERIFICATIONS */}
                        <section>
                            <div className="mb-2 bg-foreground py-1 text-center text-[10px] font-bold uppercase tracking-wider text-background">
                                Deviations & Verifications
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-[10px]">
                                <div>
                                    <div className="font-semibold">Verifications Conducted</div>
                                    {verification?.conductedBy || verification?.findings ? (
                                        <ol className="ml-4 mt-1 list-decimal space-y-0.5">
                                            {verification?.conductedBy && (
                                                <li>
                                                    Verified by {verification.conductedBy}{" "}
                                                    {verification?.verificationDate && formatDate(verification.verificationDate)}
                                                </li>
                                            )}
                                            {verification?.findings && <li>{verification.findings}</li>}
                                        </ol>
                                    ) : (
                                        <p className="mt-1 text-muted-foreground">No verifications recorded.</p>
                                    )}
                                </div>
                                <div>
                                    <div className="font-semibold">Deviations</div>
                                    {deviations?.deviationDetails ? (
                                        <p className="mt-1">{deviations.deviationDetails}</p>
                                    ) : (
                                        <p className="mt-1 text-muted-foreground">No deviations.</p>
                                    )}
                                    {deviations?.aoRecommendation && (
                                        <p className="mt-1">
                                            <span className="font-semibold">AO Recommendation: </span>
                                            {deviations.aoRecommendation}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Footer / signature line */}
                        <div className="mt-4 grid grid-cols-2 gap-8 border-t pt-4 text-[10px]">
                            <SignatureLine label="Account Officer" name={branchType.requestingOfficer || ""} />
                            <SignatureLine label="Credit Manager" name="" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }
);

ApprovalFormPreview.displayName = "ApprovalFormPreview";

/* ── helpers ──────────────────────────────────────────────────── */

function Field({
    label,
    value,
    span = 1,
}: {
    label: string;
    value: string;
    span?: number;
}) {
    return (
        <div className={cn("space-y-0.5", span > 1 && `col-span-${span}`)}>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="border-b border-border pb-0.5 font-medium">{value}</div>
        </div>
    );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <div className="flex justify-between gap-2 border-b border-dashed border-border pb-0.5">
            <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
            <span className={cn("tabular-nums", bold && "font-bold")}>{value}</span>
        </div>
    );
}

function SignatureLine({ label, name }: { label: string; name: string }) {
    return (
        <div className="space-y-0.5">
            <div className="border-b border-foreground pb-4" />
            <div className="text-center font-semibold uppercase">{name || "________________________"}</div>
            <div className="text-center text-[9px] text-muted-foreground">{label}</div>
        </div>
    );
}