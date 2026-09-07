import { forwardRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FilePdf, Printer, Warning } from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";

import { SectionCard } from "./section-card";
import { getSection } from "../sections";
import type { ClientFormData, LoanApplicationFormData } from "../schema";
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

/* ── Capacity-to-pay badge ───────────────────────────────────────── */
function CapacityToPayBadge() {
    const m = useLoanComputations();
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

function DashRows({ count, cols }: { count: number; cols: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <tr key={i}>
                    {Array.from({ length: cols }).map((_, j) => (
                        <td key={j} className="px-1.5 py-0.5 text-center">-</td>
                    ))}
                </tr>
            ))}
        </>
    );
}

/* ── main component ── */

export const ApprovalFormPreview = forwardRef<HTMLDivElement, { onGeneratePdf?: () => void }>(
    ({ onGeneratePdf }, ref) => {
        const { control } = useFormContext<LoanApplicationFormData>();
        const form = useWatch({ control }) as LoanApplicationFormData;

        const client = form?.client ?? ({} as LoanApplicationFormData["client"]);
        const branchType = form?.branchType ?? ({} as LoanApplicationFormData["branchType"]);
        const loan = form?.loan ?? ({} as LoanApplicationFormData["loan"]);
        const verification = form?.verification;
        const deviations = form?.deviations;
        const outstandingLoans = form?.outstandingLoans ?? [];
        const ebiReloans = form?.ebiReloans ?? [];
        const buyOuts = form?.buyOuts ?? [];
        const incomingLoans = form?.incomingLoans ?? [];

        // ── Loan product display name ─────────────────────────────────
        const productCode = parseProductCode(loan.product);
        const selectedLoanNo = branchType.selectedLoanNo ?? "";
        const preLoanBranchCode =
            branchType.selectedLoanBch?.trim() || form?.preLoan?.bch?.trim() || "";
        const { data: loanClass } = useCatLoanClass(
            preLoanBranchCode,
            selectedLoanNo,
            productCode
        );
        const productDisplay = resolveLoanProductDisplayName(
            loan.product,
            loanClass?.catLoanClass
        );

        // ── Shared engine results ─────────────────────────────────
        const metrics = useLoanComputations();

        const termDays = loan.term || 0;
        const applicationChargeLegacy = (loan.proposedAmount || 0) * LEGACY_APPLICATION_CHARGE_RATE;
        const docStamp = (loan.proposedAmount || 0) * LEGACY_DOC_STAMP_RATE;
        const notarialFee = LEGACY_NOTARIAL_FEE;
        const deductionsSubtotal = applicationChargeLegacy + docStamp + notarialFee;
        const deductionPct = loan.proposedAmount > 0 ? (deductionsSubtotal / loan.proposedAmount) * 100 : 0;

        const totalPrincipal = outstandingLoans.reduce((s, l) => s + (l.principalBalance || 0), 0);
        const ebiDeductions = ebiReloans.reduce((s, r) => s + (r.existingDeduction || 0), 0);
        const ebiOb = ebiReloans.reduce((s, r) => s + (r.outstandingBalance || 0), 0);
        const buyOutBalance = buyOuts.reduce((s, b) => s + (b.outstandingBalance || 0), 0);
        const incomingTotal = incomingLoans.reduce((s, i) => s + (i.deductions || 0), 0);

        const grossProceeds = (loan.proposedAmount || 0) - deductionsSubtotal;
        const netProceedsDs = grossProceeds - ebiOb;
        const netProceedsClient = netProceedsDs - buyOutBalance;
        const totalExposure = (loan.proposedAmount || 0) + totalPrincipal;

        const nthp = client.netTakeHomePay || 0;
        const netPayAfterDeduction = nthp - metrics.monthlyAmortization + ebiDeductions;
        const totalMonthlyIncome = netPayAfterDeduction;
        const totalDisposableGross = nthp + ebiDeductions;
        const totalDeductionsFinal = nthp + incomingTotal;
        const totalDisposableNet = totalDisposableGross - totalDeductionsFinal;

        const maximumLoanableAmount = computeMaximumLoanableAmount(
            totalDisposableNet,
            loan.interestRate || 0,
            termDays,
            productCode
        );

        const productLine = loan.product
            ? `[ ${loan.product} ] ${loan.term || 0} days @ ${loan.interestRate || 0}% per Annum`
            : "-";

        const remarksLines = [deviations?.remarks, deviations?.aoRecommendation, deviations?.otherRemarks].filter(
            (x): x is string => !!x
        );

        const section = getSection("approval-form");

        return (
            <SectionCard
                step={section.step}
                title={section.label}
                description={section.description}
                systemSourced
                icon={<FilePdf size={20} weight="bold" className="text-primary" />}
                badge={
                    <div className="flex items-center gap-2">
                        <CapacityToPayBadge />
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                            <Printer size={14} weight="bold" />
                            Print
                        </Button>
                        {onGeneratePdf && (
                            <Button type="button" size="sm" className="gap-1.5" onClick={onGeneratePdf}>
                                <FilePdf size={14} weight="bold" />
                                Generate PDF
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
                    className="bg-white p-5 text-[9px] leading-[1.35] text-black [font-family:Arial,Helvetica,sans-serif]"
                >
                    <div className="mx-auto w-[800px] max-w-full">
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
                                        <V blue colSpan={3}>{dash(branchType.lai)}</V>
                                    </tr>
                                    <tr>
                                        <L>Region Code :</L>
                                        <V blue>{dash(client.region)}</V>
                                        <V blue colSpan={2} rowSpan={3} className="align-bottom">
                                            PN: {dash(branchType.selectedLoanNo)}
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
                                        <V blue colSpan={4}>{dash(loan.purpose)}</V>
                                    </tr>
                                </tbody>
                            </table>

                            {/* ══ LOAN COMPUTATIONS ══ */}
                            <div className={cn(B, "text-center font-bold")}>LOAN COMPUTATIONS</div>

                            <div className={BAND_MAIN}>
                                {/* ── LEFT column ── */}
                                <div className={cn(B, "border-r-0 p-2")}>
                                    <AmtRow label={<span className="font-bold">Maximum Loanable Amount **</span>} value={num(maximumLoanableAmount)} blue underline />
                                    <AmtRow label={<span className="font-bold">Proposed Loan for Approval</span>} value={<span className="font-bold">{num(loan.proposedAmount)}</span>} blue />
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
                                        <span className={cn(`${BLUE} px-1 font-bold`)}>{isoDate(loan.nthpDate || new Date().toISOString())}</span>
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
                                        <span>{"<this PN>"}</span>
                                        <span className="tabular-nums">{num(loan.proposedAmount)}</span>
                                        <span className="tabular-nums">{num(loan.proposedAmount)}</span>
                                    </div>
                                    <div className="flex justify-end px-1 py-[1px]">
                                        <span className="min-w-24 text-right tabular-nums" style={TOP_LINE}>{num(loan.proposedAmount)}</span>
                                    </div>
                                    <div className="flex items-end justify-between px-1 py-[1px]">
                                        <span className="font-bold">Total Exposure</span>
                                        <span className={`${BLUE} px-1 font-bold tabular-nums`} style={DOUBLE_UNDERLINE}>
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

                            {/* ── EBI / Buy-Out / Incoming ──
                                The right-hand totals stack does NOT start at the top
                                of the band: on the legacy sheet it begins level with
                                the "Total Accounts for reloans" row, so a spacer
                                reproduces that offset. */}
                            <div className={cn(B, BAND_MAIN, "border-t-0")}>
                                <div className="flex flex-col p-2">
                                    <div>
                                        <div className="font-bold">Add: EBI Accounts for reloans</div>
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="[&>th]:border-b [&>th]:border-black [&>th]:px-1 [&>th]:py-0.5 [&>th]:text-left [&>th]:font-bold [&>th]:underline">
                                                    <th>Name of Financial Institution</th>
                                                    <th className="text-right!">Deductions</th>
                                                    <th className="text-right!">Old Loan/Buy-Out Balance<br />OB to be paid/closed</th>
                                                    <th>PN Number</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ebiReloans.map((r) => (
                                                    <tr key={r.pn} className="[&>td]:px-1 [&>td]:py-0.5">
                                                        <td>{r.name || r.pn}</td>
                                                        <td className="text-right tabular-nums">{num(r.existingDeduction)}</td>
                                                        <td className="text-right tabular-nums">{num(r.outstandingBalance)}</td>
                                                        <td>{r.pn}</td>
                                                    </tr>
                                                ))}
                                                <DashRows count={Math.max(0, RELOAN_TEMPLATE_ROWS - ebiReloans.length)} cols={4} />
                                                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                                    <td className="font-bold">Total Accounts for reloans</td>
                                                    <td className="text-right font-bold tabular-nums" style={DOUBLE_UNDERLINE}>{num(ebiDeductions)}</td>
                                                    <td className="text-right font-bold tabular-nums" style={DOUBLE_UNDERLINE}>{num(ebiOb)}</td>
                                                    <td />
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="pt-2">
                                        <div className="font-bold">Add: Buy-Out Accounts from other FI's</div>
                                        <table className="w-full border-collapse">
                                            <tbody>
                                                {buyOuts.map((b) => (
                                                    <tr key={b.pn} className="[&>td]:px-1 [&>td]:py-0.5">
                                                        <td>{b.name || b.pn}</td>
                                                        <td className="text-right tabular-nums">{num(b.amortization)}</td>
                                                        <td className="text-right tabular-nums">{num(b.outstandingBalance)}</td>
                                                        <td>{b.pn}</td>
                                                    </tr>
                                                ))}
                                                <DashRows count={Math.max(0, BUYOUT_TEMPLATE_ROWS - buyOuts.length)} cols={4} />
                                                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                                                    <td className="font-bold">Total Accounts for Buy-out</td>
                                                    <td className="text-right tabular-nums" style={DOUBLE_UNDERLINE} />
                                                    <td className="text-right tabular-nums" style={DOUBLE_UNDERLINE} />
                                                    <td />
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className={cn(B, "border-l-0 flex flex-col p-0")}>
                                    {/* spacer: pushes the stack down to the reloans total row */}
                                    <div className="shrink-0 grow-0 basis-[53%]" />
                                    <div className="p-2">
                                        <AmtRow label={<span className="font-bold">Total Reloan&Buy-out Accounts</span>} value={num(ebiDeductions)} underline />
                                        <div className="flex justify-between py-[1px]">
                                            <span />
                                            <span className="min-w-24 text-right tabular-nums" style={DOUBLE_UNDERLINE}>{num(ebiOb)}</span>
                                        </div>
                                        <AmtRow label={<span className="font-bold">Total Disposabe</span>} value={num(totalDisposableGross)} underline />
                                        <AmtRow label={<span className="font-bold">Less: Minimum NTHP</span>} value={num(nthp)} />

                                        <div className="flex justify-between pt-2 font-bold">
                                            <span>Incoming/undeducted Loans:</span>
                                            <span className="underline">Remarks on Incominng/Unlled Loans</span>
                                        </div>
                                        <table className="w-full border-collapse">
                                            <tbody>
                                                {incomingLoans.map((i, idx) => (
                                                    <tr key={idx} className="[&>td]:px-1 [&>td]:py-0.5">
                                                        <td>{i.name}</td>
                                                        <td className="text-right tabular-nums">{num(i.deductions)}</td>
                                                        <td>{i.remarks}</td>
                                                    </tr>
                                                ))}
                                                <DashRows count={Math.max(0, INCOMING_TEMPLATE_ROWS - incomingLoans.length)} cols={3} />
                                            </tbody>
                                        </table>

                                        <AmtRow label={<span className="font-bold">Total Deductions</span>} value={num(totalDeductionsFinal)} underline />
                                        <AmtRow label={<span className="font-bold">Total Disposabe</span>} value={num(totalDisposableNet)} blue underline />
                                        <AmtRow
                                            label={<span className="font-bold">Maximum Loanable Amount</span>}
                                            value={
                                                <span className="font-bold">
                                                    {maximumLoanableAmount < 0
                                                        ? `(PHP${num(Math.abs(maximumLoanableAmount))})`
                                                        : `PHP${num(maximumLoanableAmount)}`}
                                                </span>
                                            }
                                            blue
                                            underline
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ══ DEVIATIONS / VERIFICATIONS ══ */}
                            <div className={BAND_FOOT}>
                                <div className={cn(B, "min-h-56 border-r-0 p-1.5")}>
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
                                <div className={cn(B, "min-h-56 p-1.5")}>
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
                    </div>
                </div>
            </SectionCard>
        );
    }
);

ApprovalFormPreview.displayName = "ApprovalFormPreview";
