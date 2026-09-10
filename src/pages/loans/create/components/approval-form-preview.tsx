import { forwardRef, useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FilePdf, Printer, Warning, CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { FormTabStrip } from "@/src/components/ui/form-tab-strip";
import { cn } from "@/src/lib/utils";
import { ApprovalFormSheet } from "@/src/components/loan/approval-form-sheet";

import { SectionCard } from "./section-card";
import { getSection } from "../sections";
import type { ClientFormData, LoanApplicationFormData, SelectedLoan } from "../schema";
import { useLoanComputations } from "@/src/hooks/use-loan-computations";
import { useCatLoanClass } from "@/src/hooks/use-cat-loan-class";
import {
    parseProductCode,
    resolveLoanProductDisplayName,
} from "@/src/lib/loan-product-display";
import { computeMaximumLoanableAmount } from "@/src/lib/loan-computations";

/* ── formatting helpers (match the template: plain comma numbers) ── */

function num(value?: number | null): string {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dash(value?: string | null): string {
    return value && value.trim().length > 0 ? value : "-";
}

function isoDate(iso?: string): string {
    return iso ? iso.slice(0, 10) : "-";
}

function fullNameOf(client: Partial<ClientFormData>): string {
    const parts = [client.lastName, client.firstName, client.middleName].filter(Boolean);
    if (parts.length === 0) return "-";
    const [last, first, middle] = parts as string[];
    return middle ? `${last.toUpperCase()}, ${first.toUpperCase()} ${middle[0].toUpperCase()}.` : `${last.toUpperCase()}, ${first.toUpperCase()}`;
}

function ageFrom(isoDateStr?: string): string {
    if (!isoDateStr) return "-";
    const birth = new Date(isoDateStr);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return String(age);
}

const BLUE = "bg-[#d9eaf7]";
const B = "border border-black";
const DOUBLE_UNDERLINE: React.CSSProperties = { borderBottom: "3px double #000" };
const TOP_LINE: React.CSSProperties = { borderTop: "1px solid #000" };
const TOP_DOUBLE: React.CSSProperties = { borderTop: "1px solid #000", borderBottom: "3px double #000" };
const TOP_LINE_SINGLE: React.CSSProperties = { borderTop: "1px solid #000", borderBottom: "1px solid #000" };

/* ── Capacity-to-pay badge ───────────────────────────────────────── */
// Now accepts parameters so each loan form shows its own result.
function CapacityToPayBadge({ params }: { params: LoanApplicationFormData["loans"][number]["parameters"] | undefined }) {
    const m = useLoanComputations(params);
    const hasPrincipal = m.monthlyAmortization > 0;

    if (!hasPrincipal) return null;
    if (!m.isAmortizationExceedingDisposable) return null;

    return (
        <Badge variant="destructive" className="gap-1.5 py-1 text-xs">
            <Warning size={12} weight="fill" />
            Exceeds disposable income
        </Badge>
    );
}

/* ── small presentational atoms ── */

interface TableCellProps {
    children: React.ReactNode;
    className?: string;
    colSpan?: number;
    rowSpan?: number;
    blue?: boolean;
}

function L({ children, className, colSpan, rowSpan }: TableCellProps) {
    return <td colSpan={colSpan} rowSpan={rowSpan} className={cn(B, "px-1.5 py-0.5 font-bold", className)}>{children}</td>;
}
function V({ children, blue, className, colSpan, rowSpan }: TableCellProps) {
    return (
        <td colSpan={colSpan} rowSpan={rowSpan} className={cn(B, "px-1.5 py-0.5", blue && BLUE, className)}>
            {children}
        </td>
    );
}

function AmtRow({ label, value, blue, bold, underline, topLine, labelBold }: {
    label: React.ReactNode; value: React.ReactNode; blue?: boolean; bold?: boolean;
    underline?: boolean; topLine?: boolean; labelBold?: boolean;
}) {
    return (
        <div className="flex items-end justify-between gap-2 py-[1px]">
            <span className={cn(labelBold && "font-bold")}>{label}</span>
            <span
                className={cn("min-w-24 text-right tabular-nums", bold && "font-bold", blue && `${BLUE} px-1`, underline && "border-b border-black")}
                style={topLine ? TOP_LINE : undefined}
            >
                {value}
            </span>
        </div>
    );
}

function DashRows({ count, incoming = false }: { count: number; incoming?: boolean }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="[&>td]:px-1 [&>td]:py-0.5">
                    <td />
                    <td className="text-right tabular-nums">-</td>
                    {incoming ? (
                        <td colSpan={2} className="text-center">-</td>
                    ) : (
                        <>
                            <td className="text-right tabular-nums">-</td>
                            <td />
                        </>
                    )}
                </tr>
            ))}
        </>
    );
}

/* ── Single Loan Approval Form ─────────────────────────────────────
 *
 * Renders the approval form for a single loan. This is extracted into
 * a separate component so it can be mapped over the loans array with
 * proper print page breaks between each form.
 */
interface SingleLoanApprovalFormProps {
    loan: SelectedLoan;
    client: ClientFormData;
    branchType: LoanApplicationFormData["branchType"];
    form: LoanApplicationFormData;
    index: number;
    /**
     * Server-minted LAM ID for each loan (keyed by PN). Pre-submit this is
     * `undefined` and the sheet shows "Auto-generated on submit"; post-
     * submit each sheet prints its own LAM ID.
     */
    lamIdByLoanNo?: Record<string, string>;
}

function SingleLoanApprovalForm({
    loan,
    client,
    branchType,
    form,
    index,
    lamIdByLoanNo,
}: SingleLoanApprovalFormProps) {
    const { parameters } = loan;

    // ── Loan product display name ─────────────────────────────────
    const productCode = parseProductCode(parameters.product);
    // Each loan carries its own branchCode (extracted from accountId at toggle time)
    const preLoanBranchCode = loan.branchCode?.trim() || form?.preLoan?.bch?.trim() || "";
    const { data: loanClass } = useCatLoanClass(
        preLoanBranchCode,
        loan.loanNo,
        productCode
    );

    const productDisplay = resolveLoanProductDisplayName(
        parameters.product,
        loanClass?.catLoanClass
    );

    // ── Shared engine results — now per-loan via explicit params ────
    const metrics = useLoanComputations(parameters);

    const termDays = parameters.term || 0;
    const applicationChargeLegacy = (parameters.proposedAmount || 0) * LEGACY_APPLICATION_CHARGE_RATE;
    const docStamp = (parameters.proposedAmount || 0) * LEGACY_DOC_STAMP_RATE;
    const notarialFee = LEGACY_NOTARIAL_FEE;
    const deductionsSubtotal = applicationChargeLegacy + docStamp + notarialFee;
    const deductionPct = parameters.proposedAmount > 0 ? (deductionsSubtotal / parameters.proposedAmount) * 100 : 0;

    const outstandingLoans = form?.outstandingLoans ?? [];
    const ebiReloans = form?.ebiReloans ?? [];
    const buyOuts = form?.buyOuts ?? [];
    const incomingLoans = form?.incomingLoans ?? [];

    const totalPrincipal = outstandingLoans.reduce((s, l) => s + (l.principalBalance || 0), 0);
    const ebiDeductions = ebiReloans.reduce((s, r) => s + (r.existingDeduction || 0), 0);
    const ebiOb = ebiReloans.reduce((s, r) => s + (r.outstandingBalance || 0), 0);
    const buyOutBalance = buyOuts.reduce((s, b) => s + (b.outstandingBalance || 0), 0);
    const incomingTotal = incomingLoans.reduce((s, i) => s + (i.deductions || 0), 0);

    const grossProceeds = (parameters.proposedAmount || 0) - deductionsSubtotal;
    const netProceedsDs = grossProceeds - ebiOb;
    const netProceedsClient = netProceedsDs - buyOutBalance;
    const totalExposure = (parameters.proposedAmount || 0) + totalPrincipal;

    const nthp = client.netTakeHomePay || 0;
    const netPayAfterDeduction = nthp - metrics.monthlyAmortization + ebiDeductions;
    const totalMonthlyIncome = netPayAfterDeduction;
    const totalDisposableGross = nthp + ebiDeductions + incomingTotal;
    const totalDeductionsFinal = nthp;
    const totalDisposableNet = totalDisposableGross - totalDeductionsFinal;

    const maximumLoanableAmount = computeMaximumLoanableAmount(
        totalDisposableNet,
        parameters.interestRate || 0,
        termDays,
        productCode
    );

    const productLine = parameters.product
        ? `[ ${parameters.product} ] ${parameters.term || 0} days @ ${parameters.interestRate || 0}% per Annum`
        : "-";

    const deviations = form?.deviations;
    const verification = form?.verification;
    const remarksLines = [deviations?.remarks, deviations?.aoRecommendation, deviations?.otherRemarks].filter(
        (x): x is string => !!x
    );

    return (
        <div
            className={cn(
                "p-5",
                // Print optimization: each loan form starts on a new page
                index > 0 && "break-before-page print:break-before-page"
            )}
        >
            <ApprovalFormSheet>
                {/* Header with loan number badge */}
                {index > 0 && (
                    <div className="mb-2 text-center text-xs font-bold text-muted-foreground">
                        — Loan {index + 1} of {form.loans.length} —
                    </div>
                )}

                <h1 className="mb-2 text-sm font-bold underline">LOAN APPROVAL FORM</h1>

                <div className="border-2 border-black">
                    {/* ══ CLIENT INFORMATION ══ */}
                    <table className="w-full border-collapse">
                        <tbody>
                            <tr>
                                <td colSpan={8} className={cn(B, `${BLUE} text-center font-bold`)}>
                                    CLIENT INFORMATION
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={4} className={B} />
                                <td colSpan={1} className={cn(B, "px-1.5 py-0.5 font-bold")}>SCHOOL TYPE:</td>
                                <td colSpan={3} className={cn(B, BLUE)}>{dash(client.agency)}</td>
                            </tr>
                            <tr>
                                <L className="w-[16%]">CLIENT NAME :</L>
                                <V blue colSpan={3}>{fullNameOf(client)}</V>
                                <L className="w-[16%]">POSITION/TITLE :</L>
                                <V blue colSpan={3}>{dash(client.position)}</V>
                            </tr>
                            <tr>
                                <L>ADDRESS:</L>
                                <V blue colSpan={3}>{dash(client.address)}</V>
                                <L>Age:</L>
                                <V blue>{ageFrom(client.birthdate)}</V>
                                <L>Length of Service:</L>
                                <V blue>{dash(client.lengthOfService)}</V>
                            </tr>
                            <tr>
                                <L>Loan Application Type:</L>
                                <V blue colSpan={3}>{dash(branchType.creationTypeLabel)}</V>
                                <L>LAM ID:</L>
                                <V blue colSpan={3}>
                                    {lamIdByLoanNo?.[loan.loanNo] ?? "Auto-generated on submit"}
                                </V>
                            </tr>
                            <tr>
                                <L>Region Code :</L>
                                <V blue>{dash(client.region)}</V>
                                {/* PN displays the specific loan number for this form */}
                                <V blue colSpan={2} rowSpan={3} className="align-bottom">
                                    PN: {loan.loanNo}
                                </V>
                                <L>Branch Code :</L>
                                <V blue colSpan={3}>{dash(branchType.branch)}</V>
                            </tr>
                            <tr>
                                <L>Division Code :</L>
                                <V blue>{dash(client.divisionCode)}</V>
                                <L>Requesting Officer:</L>
                                <V blue colSpan={3}>{dash(branchType.requestingOfficer)}</V>
                            </tr>
                            <tr>
                                <L>Employee No. :</L>
                                <V blue>{dash(client.employeeId)}</V>
                                <L>Processing Date :</L>
                                <V blue colSpan={3}>{isoDate(new Date().toISOString())}</V>
                            </tr>
                            <tr>
                                <L rowSpan={2} className="align-top">Loan Product:</L>
                                <V rowSpan={2} className="align-top font-bold">{dash(productDisplay)}</V>
                                <L rowSpan={2} className="align-top">
                                    TERM (Days):<br />
                                    <span className="font-bold">{termDays.toLocaleString()}</span>
                                </L>
                                <V blue colSpan={5}>{productLine}</V>
                            </tr>
                            <tr>
                                <L>Loan Purpose:</L>
                                <V blue colSpan={4}>{dash(parameters.purpose)}</V>
                            </tr>
                        </tbody>
                    </table>

                    {/* ══ LOAN COMPUTATIONS ══ */}
                    <div className={cn(B, "text-center font-bold")}>LOAN COMPUTATIONS</div>

                    <div className={BAND_MAIN}>
                        {/* ── LEFT column ── */}
                        <div className={cn(B, "border-r-0 p-2")}>
                            <AmtRow label={<span className="font-bold">Maximum Loanable Amount **</span>} value={num(maximumLoanableAmount)} blue underline />
                            <AmtRow label={<span className="font-bold">Proposed Loan for Approval</span>} value={<span className="font-bold">{num(parameters.proposedAmount)}</span>} blue />
                            <div className="pt-1 font-bold">Less:</div>
                            <div className="pl-3">
                                <AmtRow label="Application Charge" value={num(applicationChargeLegacy)} />
                                <AmtRow label="Doc. Stamp" value={num(docStamp)} />
                                <AmtRow label="Notarial Fee" value={num(notarialFee)} />
                                <AmtRow label="Insurance (MRI)" value="-" />
                                <AmtRow label="Advance Interest" value="-" />
                            </div>
                            <div className="flex items-end justify-between gap-2 py-[1px]">
                                <span className="font-bold">Total Deductions</span>
                                <span className="tabular-nums">{deductionPct.toFixed(2)}%</span>
                                <span className="min-w-24 border-b border-black text-right tabular-nums">{num(deductionsSubtotal)}</span>
                            </div>
                            <AmtRow label={<span className="font-bold">GROSS PROCEEDS</span>} value={<span className="font-bold">{num(grossProceeds)}</span>} blue underline />
                            <div className="h-3" />
                            <AmtRow label={<span className="font-bold">Less: Total Accounts Balance</span>} value={num(ebiOb)} underline />
                            <AmtRow label={<span className="font-bold">Net Proceeds on DS for CM/MC</span>} value={num(netProceedsDs)} underline />
                            <div className="h-3" />
                            <AmtRow label={<span className="font-bold">Less: Total Buy-Out Balance</span>} value={num(buyOutBalance)} underline />
                            <AmtRow label={<span className="font-bold">NET PROCEEDS to Client</span>} value={<span className="font-bold">{num(netProceedsClient)}</span>} blue />
                            <div className="h-3" />
                            <AmtRow label={<span className="font-bold">Monthly Amortization</span>} value={`PHP ${num(metrics.monthlyAmortization)}`} underline />
                            <div className="h-3" />
                            <AmtRow label={<span className="font-bold">NetPay After Deduction</span>} value={num(netPayAfterDeduction)} underline />
                            <div className="h-3" />
                            <div className="flex items-end justify-between gap-2 py-[1px]">
                                <span className="font-bold">Net Take Home Pay as of:</span>
                                <span className={cn(`${BLUE} px-1 font-bold`)}>{isoDate(parameters.nthpDate || new Date().toISOString())}</span>
                                <span className="min-w-24 border-b border-black text-right font-bold tabular-nums">{num(nthp)}</span>
                            </div>
                        </div>

                        {/* ── RIGHT column ── */}
                        <div className={cn(B, "p-2")}>
                            <div className="font-bold underline">Outstanding Loans (do not include accounts for payoff):</div>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="[&>th]:border-b [&>th]:border-black [&>th]:px-1 [&>th]:py-0.5 [&>th]:font-bold [&>th]:underline">
                                        <th className="text-left">PN</th>
                                        <th className="text-right">Balance</th>
                                        <th className="text-right">Principal</th>
                                        <th className="text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {outstandingLoans.length === 0 && (
                                        <tr><td colSpan={4} className="px-1 py-0.5 text-center">-</td></tr>
                                    )}
                                    {outstandingLoans.map((l) => (
                                        <tr key={l.pn} className="[&>td]:px-1 [&>td]:py-0.5">
                                            <td>{l.pn}</td>
                                            <td className="text-right tabular-nums">{num(l.outstandingBalance)}</td>
                                            <td className="text-right tabular-nums">{num(l.principalBalance)}</td>
                                            <td>{l.status}</td>
                                        </tr>
                                    ))}
                                    <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                        <td />
                                        <td className="text-right tabular-nums">0.00</td>
                                        <td className="text-right tabular-nums">0.00</td>
                                        <td />
                                    </tr>
                                    <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                        <td colSpan={2} />
                                        <td className="text-right font-bold tabular-nums" style={TOP_LINE}>{num(totalPrincipal)}</td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table>

                            <div className="pt-2 font-bold">This loan availment:</div>
                            <div className="flex justify-between px-1 py-[1px]">
                                <span>{loan.loanNo}</span>
                                <span className="tabular-nums">{num(parameters.proposedAmount)}</span>
                                <span className="tabular-nums">{num(parameters.proposedAmount)}</span>
                            </div>
                            <div className="flex justify-end px-1 py-[1px]">
                                <span className="min-w-24 text-right tabular-nums" style={TOP_LINE}>{num(parameters.proposedAmount)}</span>
                            </div>
                            <div className="flex items-end justify-between px-1 py-[1px]">
                                <span className="font-bold">Total Exposure</span>
                                <span className={cn(`${BLUE} px-1 font-bold tabular-nums`)} style={DOUBLE_UNDERLINE}>
                                    {num(totalExposure)}
                                </span>
                            </div>

                            {/* Net Pay box */}
                            <div className="mt-3 border border-black">
                                <div className="border-b border-black px-1.5 py-0.5 font-bold italic underline">
                                    Net Pay After Deduction Plus Other Sources of Income
                                </div>
                                <div className="p-1.5">
                                    <AmtRow label={<i>Net Pay After Deduction</i>} value={num(netPayAfterDeduction)} />
                                    <div className="italic">Other Income:</div>
                                    <AmtRow label={<span className="pl-3">NONE</span>} value="-" />
                                    <AmtRow label={<i>Total Monthly Income</i>} value={num(totalMonthlyIncome)} underline />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── EBI / Buy-Out / Incoming ───────────────────── */}
                    <div className={cn(B, "border-t-0 p-2")}>
                        <table className="w-full table-fixed border-collapse">
                            <colgroup>
                                <col className="w-[25%]" />
                                <col className="w-[14%]" />
                                <col className="w-[22%]" />
                                <col className="w-[39%]" />
                            </colgroup>
                            <tbody>
                                <tr>
                                    <td colSpan={4} className="px-1 pt-2 font-bold">
                                        Add: EBI Accounts for reloans
                                    </td>
                                </tr>
                                {ebiReloans.map((r) => (
                                    <tr key={r.pn} className="[&>td]:px-1 [&>td]:py-0.5">
                                        <td>{r.name || r.pn}</td>
                                        <td className="text-right tabular-nums">{num(r.existingDeduction)}</td>
                                        <td className="text-right tabular-nums">{num(r.outstandingBalance)}</td>
                                        <td>{r.pn}</td>
                                    </tr>
                                ))}
                                <DashRows count={Math.max(0, 4 - ebiReloans.length)} />
                                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                    <td className="font-bold">Total Accounts for reloans</td>
                                    <td className="text-right font-bold tabular-nums" style={DOUBLE_UNDERLINE}>{num(ebiDeductions)}</td>
                                    <td className="text-right font-bold tabular-nums" style={DOUBLE_UNDERLINE}>{num(ebiOb)}</td>
                                    <td />
                                </tr>

                                <tr>
                                    <td colSpan={4} className="px-1 pt-2 font-bold">
                                        Add: Buy-Out Accounts from other FI's
                                    </td>
                                </tr>
                                {buyOuts.map((b) => (
                                    <tr key={b.pn} className="[&>td]:px-1 [&>td]:py-0.5">
                                        <td>{b.name || b.pn}</td>
                                        <td className="text-right tabular-nums">{num(b.amortization)}</td>
                                        <td className="text-right tabular-nums">{num(b.outstandingBalance)}</td>
                                        <td>{b.pn}</td>
                                    </tr>
                                ))}
                                <DashRows count={Math.max(0, 4 - buyOuts.length)} />
                                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                    <td className="font-bold">Total Accounts for Buy-out</td>
                                    <td className="text-right tabular-nums" style={DOUBLE_UNDERLINE}>-</td>
                                    <td className="text-right tabular-nums" style={DOUBLE_UNDERLINE}>-</td>
                                    <td />
                                </tr>

                                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                    <td className="font-bold">Total Reloan&Buy-out Accounts</td>
                                    <td className="text-right font-bold tabular-nums" style={DOUBLE_UNDERLINE}>{num(ebiDeductions)}</td>
                                    <td className="text-right font-bold tabular-nums" style={DOUBLE_UNDERLINE}>{num(ebiOb)}</td>
                                    <td />
                                </tr>
                                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                    <td className="font-bold">Total Disposable</td>
                                    <td className="border-b border-black text-right font-bold tabular-nums">{num(totalDisposableGross)}</td>
                                    <td />
                                    <td />
                                </tr>
                                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                    <td className="font-bold">Less: Minimum NTHP</td>
                                    <td className="text-right font-bold tabular-nums">{num(nthp)}</td>
                                    <td />
                                    <td />
                                </tr>

                                <tr className="[&>td]:px-1 [&>td]:pt-2 [&>td]:font-bold">
                                    <td colSpan={2}>Incoming/undeducted Loans:</td>
                                    <td colSpan={2} className="underline">Remarks on Incoming/Unded Loans</td>
                                </tr>
                                {incomingLoans.map((i, idx) => (
                                    <tr key={idx} className="[&>td]:px-1 [&>td]:py-0.5">
                                        <td>{i.name}</td>
                                        <td className="text-right tabular-nums">{num(i.deductions)}</td>
                                        <td colSpan={2}>{i.remarks}</td>
                                    </tr>
                                ))}
                                <DashRows count={Math.max(0, 5 - incomingLoans.length)} incoming />
                                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                    <td className="font-bold">Total Deductions</td>
                                    <td className="border-b border-black text-right font-bold tabular-nums">{num(totalDeductionsFinal)}</td>
                                    <td />
                                    <td />
                                </tr>
                                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                    <td className="font-bold">Total Disposable</td>
                                    <td className="text-right font-bold tabular-nums" style={DOUBLE_UNDERLINE}>{num(totalDisposableNet)}</td>
                                    <td />
                                    <td />
                                </tr>
                                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                    <td className="font-bold">Maximum Loanable Amount</td>
                                    <td className="text-right font-bold tabular-nums" style={DOUBLE_UNDERLINE}>
                                        {maximumLoanableAmount < 0
                                            ? `(PhP${num(Math.abs(maximumLoanableAmount))})`
                                            : `PhP${num(maximumLoanableAmount)}}`}
                                    </td>
                                    <td />
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ══ DEVIATIONS / VERIFICATIONS ══ */}
                    <div className={BAND_FOOT}>
                        <div className={cn(B, "min-h-56 border-r-0 border-t-0 p-1.5")}>
                            <div className="font-bold">Deviations:</div>
                            {deviations?.hasDeviations && deviations.deviationDetails.length > 0 ? (
                                <ol className="mt-1 space-y-0.5 list-none">
                                    {deviations.deviationDetails.map((reason, i) => (
                                        <li key={reason}>
                                            {i + 1}) {reason}
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="mt-1">-</p>
                            )}
                        </div>
                        <div className={cn(B, "min-h-56 border-t-0 p-1.5")}>
                            <div className="font-bold">Verifications Conducted:</div>
                            <ol className="mt-1 space-y-0.5">
                                {verification?.findings && <li>1) {verification.findings}</li>}
                                {!verification?.findings && <li>-</li>}
                            </ol>
                            <div className="mt-6 font-bold">Other Remarks</div>
                            <div className="mt-1">REMARKS:</div>
                            <ol className="space-y-0.5">
                                {remarksLines.length === 0 && <li>-</li>}
                                {remarksLines.map((line, i) => (
                                    <li key={i}>{i + 1}) {line}</li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            </ApprovalFormSheet>
        </div>
    );
}

/* ── Legacy template constants ─────────────────────────────────────
 *
 * The A16 product historically hard-codes the upfront deduction rates
 * and the fixed grid geometry of the printed Approval Form. These are
 * **template/formatting** values (they don't affect the bank's
 * capacity-to-pay gate) and are kept inline so the PDF export matches
 * the legacy spreadsheet line-for-line.
 */
const LEGACY_APPLICATION_CHARGE_RATE = 0.0504;
const LEGACY_DOC_STAMP_RATE = 0.0075;
const LEGACY_NOTARIAL_FEE = 500;

/* Fixed row counts of the legacy Excel grid: the reloan and buy-out
 * matrices always print 6 rows, the incoming-loan matrix 5, with "-"
 * placeholders padding unused rows. */
const RELOAN_TEMPLATE_ROWS = 6;
const BUYOUT_TEMPLATE_ROWS = 6;
const INCOMING_TEMPLATE_ROWS = 5;

/* Column bands of the legacy sheet: computations and the reloan band
 * split 58/42; the deviations band splits 62/38. */
const BAND_MAIN = "grid grid-cols-[58%_42%]";
const BAND_FOOT = "grid grid-cols-[62%_38%]";

/* ── main component ── */

export const ApprovalFormPreview = forwardRef<
    HTMLDivElement,
    {
        onGeneratePdf?: () => void;
        /** Server-minted LAM ID keyed by PN; `undefined` pre-submit. */
        lamIdByLoanNo?: Record<string, string>;
    }
>(({ onGeneratePdf, lamIdByLoanNo }, ref) => {
        const { control } = useFormContext<LoanApplicationFormData>();

        // useWatch subscribes to live form values — no desync risk from
        // a second useFieldArray snapshot. Each loan form reads via
        // useLoanComputations(parameters) for per-loan computation.
        const watchedLoans = useWatch({ control, name: "loans" }) ?? [];
        const watchedForm = useWatch({ control }) as LoanApplicationFormData;

        const client = watchedForm?.client ?? ({} as ClientFormData);
        const branchType = watchedForm?.branchType ?? ({} as LoanApplicationFormData["branchType"]);

        const section = getSection("approval-form");

        const [activeLoanNo, setActiveLoanNo] = useState("");
        const [captureAll, setCaptureAll] = useState(false); // PDF capture needs every sheet visible

        useEffect(() => {
            if (watchedLoans.length === 0) return setActiveLoanNo("");
            if (!watchedLoans.some((l) => l?.loanNo === activeLoanNo)) setActiveLoanNo(watchedLoans[0].loanNo);
        }, [watchedLoans, activeLoanNo]);

        const activeIndex = Math.max(0, watchedLoans.findIndex((l) => l?.loanNo === activeLoanNo));

        const handleGeneratePdf = async () => {
            // html2canvas skips display:none — reveal every sheet for the capture pass.
            setCaptureAll(true);
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            try { await onGeneratePdf?.(); } finally { setCaptureAll(false); }
        };

        return (
            <SectionCard
                step={section.step}
                title={section.label}
                description={section.description}
                systemSourced
                icon={<FilePdf size={20} weight="bold" className="text-primary" />}
                badge={
                    <div className="flex items-center gap-2">
                        <CapacityToPayBadge params={watchedLoans[activeIndex]?.parameters} />
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                            <Printer size={14} weight="bold" /> Print all ({watchedLoans.length})
                        </Button>
                        {onGeneratePdf && (
                            <Button type="button" size="sm" className="gap-1.5" onClick={handleGeneratePdf}>
                                <FilePdf size={14} weight="bold" /> Generate PDF
                            </Button>
                        )}
                    </div>
                }
                contentClassName="p-0"
            >
                {/* Captured area — replicates the LOAN APPROVAL FORM template 1:1.
                    Fixed 800px sheet + Arial to mirror the Excel print geometry. */}
                <div
                    ref={ref}
                    id="approval-form-preview"
                    className="bg-white text-black print:bg-white"
                >
                    {/* Empty state */}
                    {watchedLoans.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                            Select loan numbers in Step 1.3 to generate approval forms.
                        </div>
                    )}

                    {/* Master-detail: Toolbar + single active form on screen, all forms on print */}
                    {watchedLoans.length > 0 && (
                        <>
                            {/* Muted band ends exactly at the seam; active tab merges into the sheet */}
                            <div className="bg-muted/30 px-3 pt-2">
                                <FormTabStrip
                                    ariaLabel="Approval forms"
                                    activeSurface="sheet"
                                    items={watchedLoans.map((l) => ({
                                        value: l.loanNo,
                                        label: l.productCode,
                                        hint: `…${l.loanNo.slice(-4)}`,
                                        metric: num(l.parameters.proposedAmount),
                                        title: `${l.loanNo} · ${l.productDescription}`,
                                    }))}
                                    value={activeLoanNo}
                                    onValueChange={setActiveLoanNo}
                                    trailing={
                                        <>
                                            <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                                                aria-label="Previous approval form" disabled={activeIndex === 0}
                                                onClick={() => setActiveLoanNo(watchedLoans[activeIndex - 1].loanNo)}>
                                                <CaretLeft size={14} weight="bold" />
                                            </Button>
                                            <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
                                                {activeIndex + 1} / {watchedLoans.length}
                                            </span>
                                            <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                                                aria-label="Next approval form" disabled={activeIndex === watchedLoans.length - 1}
                                                onClick={() => setActiveLoanNo(watchedLoans[activeIndex + 1].loanNo)}>
                                                <CaretRight size={14} weight="bold" />
                                            </Button>
                                        </>
                                    }
                                />
                            </div>

                            {/* Sheets: screen shows the active one; print emits the whole package,
                                one form per physical page (the bank's assembly requirement). */}
                            <div ref={ref} id="approval-form-preview" className="bg-white text-black">
                                {watchedLoans.map((loan, index) => (
                                    <div
                                        key={loan.loanNo}
                                        id={`form-panel-${loan.loanNo}`}
                                        role="tabpanel"
                                        aria-labelledby={`form-tab-${loan.loanNo}`}
                                        className={cn(
                                            "p-5 text-[10px] leading-[1.4]",
                                            loan.loanNo !== activeLoanNo && !captureAll && "hidden print:block",
                                            index > 0 && "print:break-before-page"
                                        )}
                                    >
                                        {index > 0 && (
                                            <div className="mb-2 hidden text-center text-[9px] font-bold print:block">
                                                — Loan {index + 1} of {watchedLoans.length} —
                                            </div>
                                        )}
                                        <SingleLoanApprovalForm
                                                loan={loan}
                                                client={client}
                                                branchType={branchType}
                                                form={watchedForm}
                                                index={index}
                                                lamIdByLoanNo={lamIdByLoanNo}
                                            />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </SectionCard>
        );
    }
);

ApprovalFormPreview.displayName = "ApprovalFormPreview";