import React, { forwardRef, memo } from "react";
import { RichText } from "@/src/components/ui/rich-text";
import { cn } from "@/src/shared/lib/utils";
import {
    parseProductCode,
    resolveLoanProductDisplayName,
} from "@/src/features/loans/utils/loan-product-display";
import {
    computeLoanMetrics,
    buildProductLine,
    isBlankReloan,
    isBlankBuyOut,
    isBlankIncomingLoan,
    printableObligationRows,
    type ProductFeeConfig,
} from "@/src/features/loans/utils/loan-approval-utils";
import { ApprovalFormSheet } from "@/src/features/loans/components/approval-form-sheet";
import { useLoanProduct } from "@/src/features/admin/loan-products/hooks/use-loan-products";
import type {
    ClientFormData,
    LoanApplicationFormData,
} from "@/src/features/loans/schemas/schema";
import type { SignatureSlotDto } from "@/src/features/loans/api/signatures";

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

/**
 * Canonical audit-trail action as returned by `LoanDetailResponse.actions`.
 * Kept inline rather than imported from `loan-review` to avoid pulling the
 * full review API surface into a pure presentational component.
 */
export interface ApprovalFormActionEntry {
    id: number;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    comments: string | null;
    actionDate: string;
    actionByUserName: string;
}

/**
 * Group actions by local calendar date for the printed audit trail.
 * Newest-first so the most recent state change sits at the top of the
 * printout — mirrors how the on-screen ApplicationTimeline defaults.
 */
function groupActionsByDate(
    actions: ApprovalFormActionEntry[],
): Array<{ date: string; dateLabel: string; entries: ApprovalFormActionEntry[] }> {
    const map = new Map<string, ApprovalFormActionEntry[]>();
    for (const a of actions) {
        const iso = a.actionDate;
        const dayKey = iso ? iso.slice(0, 10) : "unknown";
        const bucket = map.get(dayKey);
        if (bucket) bucket.push(a);
        else map.set(dayKey, [a]);
    }
    return Array.from(map.entries())
        .sort((a, b) => (a[0] > b[0] ? -1 : a[0] < b[0] ? 1 : 0))
        .map(([date, entries]) => {
            const d = new Date(date);
            const dateLabel = Number.isNaN(d.getTime())
                ? date
                : d.toLocaleDateString("en-PH", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                  });
            return {
                date,
                dateLabel,
                entries: [...entries].sort((a, b) =>
                    (a.actionDate ?? "") > (b.actionDate ?? "") ? -1 : 1,
                ),
            };
        });
}

function formatActionTime(iso: string): string {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

/**
 * Render the status transition string for an audit entry.
 *   "ForRecommendation → ForChecking"
 *   "ForApproval → Approved"
 * `null` on either side renders as "—" so the column never collapses.
 */
function formatTransition(
    from: string | null,
    to: string | null,
): string {
    const f = from?.trim() || "—";
    const t = to?.trim() || "—";
    return `${f} → ${t}`;
}

const BLUE = "bg-[#d9eaf7]";
const B = "border border-black";
const DOUBLE_UNDERLINE: React.CSSProperties = { borderBottom: "3px double #000" };
const TOP_DOUBLE: React.CSSProperties = { borderTop: "1px solid #000", borderBottom: "3px double #000" };

/* ── pure computations live in `@/src/lib/loan-approval-utils` ──
 * Kept out of this file so the component-only-export / HMR contract
 * (`react-refresh/only-export-components`) stays satisfied. */

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

/**
 * Right rail (col 5) of the obligations matrix. The legacy layout drew it
 * as a single rowSpan=21 cell; per-row cells keep the vertical rule intact
 * while the conditional reloan/buy-out/incoming blocks above come and go.
 */
function RailCell({ children }: { children?: React.ReactNode }) {
    return (
        <td className="border-l border-black px-1.5 py-0.5 text-center tabular-nums">
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
                style={topLine ? { borderTop: "1px solid #000" } : undefined}
            >
                {value}
            </span>
        </div>
    );
}

/* ── Signature block atom ── */

function SignatureBlock({ slot }: { slot: SignatureSlotDto }) {
    const name = slot.signedByName?.trim();
    const title = slot.signedByJobTitle?.trim() || slot.jobTitle || "\u2014";
    return (
        <div>
            <div className="font-bold">{slot.action}:</div>
            {/* wet-ink line */}
            <div className="mt-8 border-b border-black" />
            <div className="mt-0.5 font-bold">{name ?? "\u00A0"}</div>
            <div>
                {title} <span className="font-bold">({slot.role})</span>
            </div>
            <div className="mt-1">
                Date signed:{" "}
                <span className="tabular-nums">
                    {slot.signedAt ? isoDate(slot.signedAt) : "____________"}
                </span>
            </div>
        </div>
    );
}

/* ── main component (pure, prop-driven) ── */

interface ApprovalFormDocumentProps {
    data: LoanApplicationFormData;
    /**
     * Optional: which loan to render. Defaults to the first loan in
     * `data.loans`. Pass an explicit index when the parent is iterating
     * one approval form per selected loan.
     */
    loanIndex?: number;
    /**
     * `loan_data.cat_loan_class` of the selected preloan, resolved by the
     * page via GET /api/webloans/loan-class. Only class-scoped products
     * (C23/C35 → BONUS / YEB vs BONUS / MYB) consume it; null/undefined
     * falls back to the backend description (see loan-product-display.ts).
     */
    catLoanClass?: string | null;
    /** Server-resolved signature chain (page 2). Omitted → section hidden. */
    signatureSlots?: SignatureSlotDto[];
    /**
     * Canonical audit-trail actions for this loan application. Rendered on
     * page 3 of the printed form. `undefined` or empty → section hidden.
     * Sourced from `LoanDetailResponse.actions` by the parent page.
     */
    actions?: ApprovalFormActionEntry[];
}

const ApprovalFormDocumentBase = forwardRef<HTMLDivElement, ApprovalFormDocumentProps>(({ data, loanIndex = 0, catLoanClass, signatureSlots, actions }, ref) => {
    const client = data?.client ?? ({} as LoanApplicationFormData["client"]);
    const branchType = data?.branchType ?? ({} as LoanApplicationFormData["branchType"]);
    // Multi-loan: the printed approval form is scoped to one loan. The
    // parent can pass `loanIndex` to render each selected loan's form.
    const primaryLoan = data?.loans?.[loanIndex];
    const params = primaryLoan?.parameters;
    const verification = primaryLoan?.verification;
    const deviations = primaryLoan?.deviations;
    const outstandingLoans = data?.outstandingLoans ?? [];
    const ebiReloans = primaryLoan?.ebiReloans ?? [];
    const buyOuts = primaryLoan?.buyOuts ?? [];
    const incomingLoans = primaryLoan?.incomingLoans ?? [];

    // Printed obligation rows: blank wizard placeholders are dropped so an
    // empty matrix collapses instead of printing the legacy fixed dash rows.
    const reloanRows = printableObligationRows(ebiReloans, isBlankReloan);
    const buyOutRows = printableObligationRows(buyOuts, isBlankBuyOut);
    const incomingRows = printableObligationRows(incomingLoans, isBlankIncomingLoan);

    // Fetch product fee config for accurate deduction computation.
    const productCodeForLookup = params?.product ? parseProductCode(params.product) : null;
    const { data: loanProduct } = useLoanProduct(productCodeForLookup);
    const productFees: ProductFeeConfig | undefined = loanProduct
        ? {
              applicationChargeRate: loanProduct.applicationChargeRate,
              notarialFee: loanProduct.notarialFee,
              insuranceFee: loanProduct.insuranceFee,
              chargeAdvanceInterest: loanProduct.chargeAdvanceInterest,
              advanceInterestRate: loanProduct.advanceInterestRate,
          }
        : undefined;

    // Bail out cleanly when no loan is selected so the parent renders an
    // empty state instead of an explosion of `undefined.X` reads.
    if (!primaryLoan || !params) {
        return (
            <div
                ref={ref}
                id="approval-form-document"
                data-print-root
                className="bg-white p-5 text-black print:bg-white"
            >
                <ApprovalFormSheet>
                    <h1 className="mb-2 text-sm font-bold underline">LOAN APPROVAL FORM</h1>
                    <p className="text-sm">Select a loan in Step 1.3 to render its approval form.</p>
                </ApprovalFormSheet>
            </div>
        );
    }

    const c = computeLoanMetrics(primaryLoan, {
        outstandingLoans,
        ebiReloans,
        buyOuts,
        incomingLoans,
        client,
    }, productFees);

    const productCode = parseProductCode(params.product);
    const productDisplay = resolveLoanProductDisplayName(params.product, catLoanClass);

    // Frozen-first term/rate from shared metrics — keeps the printed
    // form aligned with the preview (see computeLoanMetrics).
    const approvalTermDays = c.approvalTermDays;
    const annualRatePercent = c.annualRatePercent;

    const productLine = params.product
        ? buildProductLine(productCode, productDisplay, approvalTermDays, params.policyTermMonths, annualRatePercent)
        : "-";

    const remarksLines = [deviations?.remarks, deviations?.aoRecommendation].filter(
        (x): x is string => !!x
    );
    const otherRemarks = deviations?.otherRemarks;

    return (
        <div
            ref={ref}
            id="approval-form-document"
            data-print-root
            className="bg-white p-5 text-black print:bg-white"
        >
            <ApprovalFormSheet>
                <h1 className="mb-2 text-sm font-bold underline">LOAN APPROVAL FORM</h1>

                <div className="border-2 border-b-0 border-black print:border-b-2">
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
                            <V blue colSpan={2} rowSpan={3} className="align-middle">
                                PN: {dash(primaryLoan.loanNo || data?.outstandingLoans[0]?.pn)}
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
                                <span className="font-bold">{approvalTermDays.toLocaleString()}</span>
                            </L>
                            <V blue colSpan={5}>{productLine}</V>
                        </tr>
                        <tr>
                            <L>Loan Purpose:</L>
                            <V blue colSpan={4}>{dash(params.purpose)}</V>
                        </tr>
                    </tbody>
                </table>

                {/* ══ LOAN COMPUTATIONS ══ */}
                <div className={cn(B, "text-center font-bold")}>LOAN COMPUTATIONS</div>

                <div className="grid grid-cols-2">
                    {/* ── LEFT column ── */}
                    <div className={cn(B, "border-r-0 p-2")}>
                        <AmtRow label={<span className="font-bold">Maximum Loanable Amount **</span>} value={num(c.maximumLoanableAmount)} blue underline />
                        <AmtRow label={<span className="font-bold">Proposed Loan for Approval</span>} value={<span className="font-bold">{num(params.proposedAmount)}</span>} blue />
                        <div className="pt-1 font-bold" style={DOUBLE_UNDERLINE}>Less:</div>
                        <div className="pl-3">
                            <AmtRow label="Application Charge" value={num(c.applicationCharge)} />
                            <AmtRow label="Doc. Stamp" value={num(c.docStamp)} />
                            <AmtRow label="Notarial Fee" value={num(c.notarialFee)} />
                            <AmtRow label="Insurance (MRI)" value="-" />
                            <AmtRow label="Advance Interest" value="-" />
                        </div>
                        <div className="flex items-end justify-between gap-2 py-[1px]">
                            <span className="font-bold">Total Deductions</span>
                            <span className="tabular-nums">{c.deductionPct.toFixed(2)}%</span>
                            <span className="min-w-24 border-b border-black text-right tabular-nums">{num(c.deductionsSubtotal)}</span>
                        </div>
                        <AmtRow label={<span className="font-bold">GROSS PROCEEDS</span>} value={<span className="font-bold">{num(c.grossProceeds)}</span>} blue underline />
                        <div className="h-3" />
                        <AmtRow label={<span className="font-bold">Less: Total Accounts Balance</span>} value={num(c.ebiOb)} underline />
                        <AmtRow label={<span className="font-bold">Net Proceeds on DS for CM/MC</span>} value={num(c.netProceedsDs)} underline />
                        <div className="h-3" />
                        <AmtRow label={<span className="font-bold">Less: Total Buy-Out Balance</span>} value={num(c.buyOutBalance)} underline />
                        <AmtRow label={<span className="font-bold">NET PROCEEDS to Client</span>} value={<span className="font-bold">{num(c.netProceedsClient)}</span>} blue />
                        <div className="h-3" />
                        <AmtRow label={<span className="font-bold">Monthly Amortization</span>} value={`PHP ${num(c.amortization)}`} underline />
                        <div className="h-3" />
                        <AmtRow label={<span className="font-bold">NetPay After Deduction</span>} value={num(c.netPayAfterDeduction)} underline />
                        <div className="h-3" />
                        <div className="flex items-end justify-between gap-2 py-[1px]">
                            <span className="font-bold">Net Take Home Pay as of:</span>
                            <span className={cn(`${BLUE} px-1 font-bold`)}>{isoDate(params.nthpDate || new Date().toISOString())}</span>
                            <span className="min-w-24 border-b border-black text-right font-bold tabular-nums">{num(c.nthp)}</span>
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
                                    <td className="border-b border-black text-right font-bold tabular-nums">{num(c.totalPrincipal)}</td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>

                        <div className="pt-2 font-bold">This loan availment:</div>
                        <div className="flex justify-between px-1 py-[1px]">
                            <span>{dash(primaryLoan.loanNo)}</span>
                            <span className="tabular-nums">{num(params.proposedAmount)}</span>
                            <span className="tabular-nums">{num(params.proposedAmount)}</span>
                        </div>
                        <div className="flex justify-end px-1 py-[1px]">
                            <span className="min-w-24 border-b border-black text-right tabular-nums">{num(params.proposedAmount)}</span>
                        </div>
                        <div className="flex items-end justify-between px-1 py-[1px]">
                            <span className="font-bold">Total Exposure</span>
                            <span className={`${BLUE} px-1 font-bold tabular-nums`} style={DOUBLE_UNDERLINE}>
                                {num(c.totalExposure)}
                            </span>
                        </div>

                        {/* Net Pay box */}
                        <div className="mt-3 border border-black">
                            <div className="border-b border-black px-1.5 py-0.5 font-bold italic underline">
                                Net Pay After Deduction Plus Other Sources of Income
                            </div>
                            <div className="p-1.5">
                                <AmtRow label={<i>Net Pay After Deduction</i>} value={num(c.netPayAfterDeduction)} />
                                <div className="italic">Other Income:</div>
                                <AmtRow label={<span className="pl-3">NONE</span>} value="-" />
                                <AmtRow label={<i>Total Monthly Income</i>} value={num(c.totalMonthlyIncome)} underline />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── EBI / Buy-Out / Incoming ──
                    Mirrors loan_approval_template.pdf: one fixed grid whose
                    matrix columns end at ~71%; the right rail holds the
                    incoming-loan column and the summary stack reuses the
                    matrix columns. Each obligation block renders only when
                    it carries values — the legacy fixed blank rows wasted
                    half a sheet and cut the page. `break-inside-avoid`
                    keeps the compact grid whole near page boundaries. */}
                <table className={cn(B, "w-full table-fixed border-collapse border-t-0 break-inside-avoid")}>
                    <colgroup>
                        <col className="w-[22%]" />
                        <col className="w-[13%]" />
                        <col className="w-[19%]" />
                        <col className="w-[17%]" />
                        <col className="w-[29%]" />
                    </colgroup>
                    <tbody>
                        {reloanRows.length > 0 && (
                            <>
                                <tr>
                                    <td colSpan={4} className="px-1.5 py-0.5 font-bold">Add: EBI Accounts for reloans</td>
                                    <RailCell />
                                </tr>
                                <tr>
                                    <td className="px-1.5 py-0.5 font-bold underline">Name of Financial Institution</td>
                                    <td className="px-1.5 py-0.5 text-right font-bold underline">Deductions</td>
                                    <td className="px-1.5 py-0.5 text-right font-bold underline">OB to be paid/closed</td>
                                    <td className="px-1.5 py-0.5 font-bold underline">PN Number</td>
                                    <RailCell />
                                </tr>
                                {reloanRows.map((r, i) => (
                                    <tr key={`reloan-${i}`}>
                                        <td className="px-1.5 py-0.5">{r.name || r.pn}</td>
                                        <td className="px-1.5 py-0.5 text-center tabular-nums">{num(r.existingDeduction)}</td>
                                        <td className="px-1.5 py-0.5 text-center tabular-nums">{num(r.outstandingBalance)}</td>
                                        <td className="px-1.5 py-0.5">{r.pn}</td>
                                        <RailCell />
                                    </tr>
                                ))}
                                <tr>
                                    <td className="px-1.5 py-0.5 font-bold">Total Accounts for reloans</td>
                                    <td className="px-1.5 py-0.5 text-right font-bold tabular-nums" style={TOP_DOUBLE}>{num(c.ebiDeductions)}</td>
                                    <td className="px-1.5 py-0.5 text-right font-bold tabular-nums" style={TOP_DOUBLE}>{num(c.ebiOb)}</td>
                                    <td />
                                    <RailCell />
                                </tr>
                            </>
                        )}

                        {buyOutRows.length > 0 && (
                            <>
                                <tr>
                                    <td colSpan={4} className="px-1.5 py-0.5 font-bold">Add: Buy-Out Accounts from other FI's</td>
                                    <RailCell />
                                </tr>
                                {buyOutRows.map((b, i) => (
                                    <tr key={`buyout-${i}`}>
                                        <td className="px-1.5 py-0.5">{b.name || b.pn}</td>
                                        <td className="px-1.5 py-0.5 text-center tabular-nums">{num(b.amortization)}</td>
                                        <td className="px-1.5 py-0.5 text-center tabular-nums">{num(b.outstandingBalance)}</td>
                                        <td className="px-1.5 py-0.5">{b.pn}</td>
                                        <RailCell />
                                    </tr>
                                ))}
                                <tr>
                                    <td className="px-1.5 py-0.5 font-bold">Total Accounts for Buy-out</td>
                                    <td className="px-1.5 py-0.5 text-center tabular-nums" style={TOP_DOUBLE}>-</td>
                                    <td className="px-1.5 py-0.5 text-center tabular-nums" style={TOP_DOUBLE}>-</td>
                                    <td />
                                    <RailCell />
                                </tr>
                            </>
                        )}

                        {/* ── summary stack: reuses the matrix columns ── */}
                        <tr>
                            <td className="px-1.5 py-0.5 font-bold">Total Reloan&Buy-out Accounts</td>
                            <td className="px-1.5 py-0.5 text-right font-bold tabular-nums" style={TOP_DOUBLE}>{num(c.ebiDeductions)}</td>
                            <td className="px-1.5 py-0.5 text-right font-bold tabular-nums" style={TOP_DOUBLE}>{num(c.ebiOb)}</td>
                            <td />
                            <RailCell />
                        </tr>
                        <tr>
                            <td className="px-1.5 py-0.5 font-bold">Total Disposable</td>
                            <td className="px-1.5 py-0.5 text-right tabular-nums" style={DOUBLE_UNDERLINE}>{num(c.totalDisposableGross)}</td>
                            <td />
                            <td />
                            <RailCell />
                        </tr>
                        <tr>
                            <td className="px-1.5 py-0.5 font-bold">Less: Minimum NTHP</td>
                            <td className="px-1.5 py-0.5 text-right tabular-nums">{num(c.minimumNthp)}</td>
                            <td />
                            <td />
                            <RailCell />
                        </tr>

                        {incomingRows.length > 0 && (
                            <>
                                <tr>
                                    <td className="px-1.5 py-0.5 font-bold">Incoming/undeducted Loans:</td>
                                    <td />
                                    <td colSpan={2} className="px-1.5 py-0.5 font-bold underline">Remarks on Incoming/Unded Loans</td>
                                    <RailCell />
                                </tr>
                                {incomingRows.map((inc, i) => (
                                    <tr key={`incoming-${i}`}>
                                        <td className="px-1.5 py-0.5">{inc.name}</td>
                                        <td className="px-1.5 py-0.5 text-center tabular-nums">{num(inc.deductions)}</td>
                                        <td colSpan={2} className="px-1.5 py-0.5">{inc.remarks}</td>
                                        <RailCell />
                                    </tr>
                                ))}
                            </>
                        )}

                        <tr>
                            <td className="px-1.5 py-0.5 font-bold">Total Deductions</td>
                            <td className="px-1.5 py-0.5 text-right tabular-nums" style={TOP_DOUBLE}>{num(c.totalDeductionsFinal)}</td>
                            <td />
                            <td />
                            <RailCell />
                        </tr>
                        <tr>
                            <td className="px-1.5 py-0.5 font-bold">Total Disposable</td>
                            <td className="px-1.5 py-0.5 text-right font-bold tabular-nums" style={DOUBLE_UNDERLINE}>{num(c.totalDisposableNet)}</td>
                            <td />
                            <td />
                            <RailCell />
                        </tr>
                        <tr>
                            <td className="px-1.5 py-0.5 font-bold">Maximum Loanable Amount</td>
                            <td className="px-1.5 py-0.5 text-right font-bold tabular-nums" style={DOUBLE_UNDERLINE}>
                                {c.maximumLoanableAmount < 0
                                    ? `(PhP${num(Math.abs(c.maximumLoanableAmount))})`
                                    : `PhP${num(c.maximumLoanableAmount)}`}
                            </td>
                            <td />
                            <td />
                            <RailCell />
                        </tr>
                    </tbody>
                </table>
                </div>

                {/* ══ PAGE 2 — certifications & signatures ══
                    break-before-page gives a real printed page; the dashed
                    rule is the on-screen page gap only. Continuation header
                    keeps the page attributable when sheets get separated. */}
                <section className="break-before-page">
                    <div className="hidden print:mb-3 print:flex print:items-baseline print:justify-between print:border-b-2 print:border-black print:pb-1">
                        <span className="text-sm font-bold underline">
                            LOAN APPROVAL FORM
                        </span>
                        <span className="tabular-nums">
                            {fullNameOf(client)} · LAM {dash(branchType.lai)} · PN{" "}
                            {dash(primaryLoan.loanNo || data?.outstandingLoans[0]?.pn)}
                        </span>
                    </div>

                    <div className="border-2 border-t-0 border-black print:border-t-2">
                        <div className="grid grid-cols-2">
                            <div className={cn(B, "min-h-40 border-r-0 p-1.5")}>
                                <div className="font-bold">Deviations:</div>
                                {deviations?.hasDeviations && deviations.deviationDetails.length > 0 ? (
                                    <ol className="mt-1 space-y-0.5 list-none">
                                        {deviations.deviationDetails.map((reason: string, i: number) => (
                                            <li key={reason}>
                                                {i + 1}) {reason}
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <p className="mt-1">-</p>
                                )}
                            </div>
                            <div className={cn(B, "min-h-40 p-1.5")}>
                                <div className="font-bold">Verifications Conducted:</div>
                                <RichText value={verification?.findings} className="mt-1" />
                                <div className="mt-4 font-bold">Other Remarks</div>
                                <div className="mt-1">REMARKS:</div>
                                <ol className="space-y-0.5">
                                    {remarksLines.length === 0 && !otherRemarks && <li>-</li>}
                                    {remarksLines.map((line, i) => (
                                        <li key={i}>{i + 1}) {line}</li>
                                    ))}
                                </ol>
                                {otherRemarks ? <RichText value={otherRemarks} className="mt-1" /> : null}
                            </div>
                        </div>

                        {/* ── Signature blocks, encoder → approver ── */}
                        {signatureSlots && signatureSlots.length > 0 && (
                            <div className="border-t-2 border-black p-3 break-inside-avoid">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                    {signatureSlots.map((slot) => (
                                        <SignatureBlock key={slot.role} slot={slot} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ══ PAGE 3 — Application history / audit trail ══
                    Print-only sheet. On-screen reviewers read the LIVE
                    ApplicationTimeline in the Workflow rail; the frozen audit
                    trail must not compete with it on the screen sheet, so it
                    ships only in the printed pack. `hidden print:block` keeps
                    the DOM for the print pass while removing it from the
                    on-screen preview; `break-before-page` starts a fresh
                    physical sheet; `break-inside-avoid` keeps each date-group
                    atomic so no row is torn between pages. Continuation header
                    mirrors page 2 so a separated sheet is attributable. */}
                {actions && actions.length > 0 && (
                    <section className="hidden break-before-page print:block">
                        <div className="hidden print:mb-3 print:flex print:items-baseline print:justify-between print:border-b-2 print:border-black print:pb-1">
                            <span className="text-sm font-bold underline">
                                LOAN APPROVAL FORM
                            </span>
                            <span className="tabular-nums">
                                {fullNameOf(client)} · LAM {dash(branchType.lai)} · PN{" "}
                                {dash(primaryLoan.loanNo || data?.outstandingLoans[0]?.pn)}
                            </span>
                        </div>

                        <div className="border-2 border-t-0 border-black print:border-t-2">
                            <div className={cn(B, "text-center font-bold")}>APPLICATION HISTORY</div>

                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th
                                            colSpan={4}
                                            className="border border-black bg-[#d9eaf7] px-1.5 py-1 text-left text-xs font-bold uppercase tracking-wider"
                                        >
                                            Audit trail recorded by the system
                                        </th>
                                    </tr>
                                    <tr className="[&>th]:border-b [&>th]:border-black [&>th]:px-1.5 [&>th]:py-1 [&>th]:text-left [&>th]:text-xs [&>th]:font-bold">
                                        <th className="w-[15%]">Date / Time</th>
                                        <th className="w-[20%]">Actor</th>
                                        <th className="w-[25%]">Action · Status</th>
                                        <th>Remarks / Conditions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupActionsByDate(actions).map((group) => (
                                        <React.Fragment key={group.date}>
                                            <tr className="break-inside-avoid align-top">
                                                <td
                                                    colSpan={4}
                                                    className="border border-black border-b-0 bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-700"
                                                >
                                                    {group.dateLabel}
                                                </td>
                                            </tr>
                                            {group.entries.map((entry) => (
                                                <tr
                                                    key={entry.id}
                                                    className="break-inside-avoid [&>td]:border [&>td]:border-black [&>td]:px-1.5 [&>td]:py-1 [&>td]:align-top"
                                                >
                                                    <td className="whitespace-nowrap tabular-nums">
                                                        <div className="text-[10px]">{isoDate(entry.actionDate)}</div>
                                                        <div className="text-[10px] text-slate-600">
                                                            {formatActionTime(entry.actionDate)}
                                                        </div>
                                                    </td>
                                                    <td className="text-xs">
                                                        {dash(entry.actionByUserName)}
                                                    </td>
                                                    <td className="text-xs">
                                                        <div className="font-medium">
                                                            {dash(entry.action)}
                                                        </div>
                                                        <div className="text-[10px] text-slate-600">
                                                            {formatTransition(
                                                                entry.fromStatus,
                                                                entry.toStatus,
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-xs">
                                                        {entry.comments?.trim() ? (
                                                            <RichText value={entry.comments} emptyFallback={<span className="text-slate-400">—</span>} />
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>

                            <div className="mt-4 px-2 pb-3 text-[10px] italic text-slate-600">
                                End of application history for LAM {dash(branchType.lai)} · PN{" "}
                                {dash(primaryLoan.loanNo || data?.outstandingLoans[0]?.pn)}.
                                Generated {new Date().toLocaleString("en-PH", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                })}.
                            </div>
                        </div>
                    </section>
                )}
            </ApprovalFormSheet>
        </div>
    );
});
ApprovalFormDocumentBase.displayName = "ApprovalFormDocument";

/**
 * Memoized on purpose: the sheet is ~600 DOM nodes and recomputes loan
 * metrics per render. The page hands it referentially stable props
 * (`formData` via useMemo, `catLoanClass` a primitive), so sidebar query
 * resolutions (history / remarks / files) no longer re-render the document.
 */
export const ApprovalFormDocument = memo(ApprovalFormDocumentBase);
