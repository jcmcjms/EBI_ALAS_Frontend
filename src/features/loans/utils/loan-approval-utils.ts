/**
 * Loan Approval Utilities
 * ------------------------
 * Pure helpers shared between the approval-form preview
 * (`approval-form-preview.tsx`), the standalone document
 * (`approval-form-document.tsx`), and any future unit tests. Kept
 * out of `approval-form-document.tsx` so the file continues to
 * export *only* the component (React Refresh / HMR contract).
 *
 * The export shape mirrors the values `approval-form-document.tsx`
 * renders inline; if those change, this module must change too.
 *
 * IMPORTANT: `resolveApprovalTermDays`, `toAnnualRatePercent`, and
 * `buildProductLine` are the single source of truth for the approval-
 * form boundary normalization. The backend mirrors these in
 * `ApprovalFormConventions.cs` — do not "fix" one side without the
 * other. The shared case table in both test suites keeps them identical.
 */

import { parseProductCode } from "./loan-product-display";
import {
    computeMaximumLoanableAmount,
    computeMonthlyAmortization,
} from "./loan-computations";
import type {
    BuyOut,
    EbiReloan,
    IncomingLoan,
    LoanApplicationFormData,
    SelectedLoan,
} from "../schemas/schema";

// ── Approval-form boundary constants ─────────────────────────────────
// Mirror of ApprovalFormConventions.cs — keep in sync.

/** Days per month in the legacy "1 month = 30 days" convention. */
export const DAYS_PER_MONTH = 30;

/**
 * Bank-policy take-home-pay floor the borrower must retain after all
 * deductions ("Less: Minimum NTHP" row on the approval form).
 */
export const DEFAULT_MINIMUM_NTHP = 5_000;

/**
 * Single-payment products (policy count = 1) diverge from the real term
 * by far more than any grace period; quote feed days verbatim when the
 * gap exceeds this tolerance.
 */
export const GRACE_TOLERANCE_DAYS = 120;

/**
 * Legacy deduction convention printed on the Approval Form: Total
 * Deductions is fixed at 6% of the proposed amount. Application Charge
 * is the plug after Doc. Stamp (webloan c_doc_stamp) and the Notarial
 * Fee (₱500) so the column foots to exactly 6.00%.
 *
 * These are fallback defaults for when product data is not available.
 * The actual rates come from the LoanProduct table and are passed via
 * the `ProductFeeConfig` parameter to `computeLoanMetrics`.
 */
export const LEGACY_TOTAL_DEDUCTION_RATE = 0.06;
export const LEGACY_NOTARIAL_FEE = 500;

/**
 * Product-specific fee configuration from the LoanProduct table.
 * When provided to `computeLoanMetrics`, overrides the legacy hardcoded
 * defaults so the approval form matches the product's actual policy.
 */
export interface ProductFeeConfig {
    /** Application charge rate as decimal (e.g. 0.065 for 6.5%). */
    applicationChargeRate: number;
    /** Flat notarial fee in PHP. */
    notarialFee: number;
    /** Flat insurance/MRI fee in PHP. */
    insuranceFee: number;
    /** Whether this product charges advance interest at disbursement. */
    chargeAdvanceInterest: boolean;
    /** Advance-interest annual rate as decimal (e.g. 0.18 for 18% p.a.). */
    advanceInterestRate: number;
}

// ── Approval-form boundary normalization ─────────────────────────────
// These functions are the single source of truth for how raw webloan
// feed values are normalized for the printed approval form. Both
// `approval-form-preview.tsx` (create page) and
// `approval-form-document.tsx` (review page) MUST import from here.

/**
 * Resolves the TERM (Days) value printed on the approval form.
 * When `policyTermMonths` is present and its 30-day equivalent is within
 * `GRACE_TOLERANCE_DAYS` of the feed term, the policy-derived value wins.
 * Otherwise the raw feed days are quoted verbatim (single-payment products,
 * or missing policy data).
 *
 * Backend mirror: `ApprovalFormConventions.ResolveApprovalTermDays`
 */
export function resolveApprovalTermDays(
    feedTermDays: number,
    policyTermMonths?: number | null,
): number {
    if (!policyTermMonths || policyTermMonths <= 0) return feedTermDays;
    const policyDays = policyTermMonths * DAYS_PER_MONTH;
    return Math.abs(policyDays - feedTermDays) <= GRACE_TOLERANCE_DAYS
        ? policyDays
        : feedTermDays;
}

/**
 * WebLoan ships `grantedRate` as a decimal fraction (0.2157) while the
 * approval form is parameterized in percent (21.57). Idempotent for
 * values already in percent. No consumer product prices at ≤ 1% p.a.
 *
 * Backend mirror: `ApprovalFormConventions.ToAnnualRatePercent`
 */
export function toAnnualRatePercent(rate?: number | null): number {
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return 0;
    return rate <= 1 ? rate * 100 : rate;
}

/** Trims float artefacts (9.660000000000001 → "9.66") for printed lines. */
export function formatRatePercent(rate: number): string {
    return String(Number(rate.toFixed(4)));
}

/**
 * Builds the product line string for the approval form header, matching
 * the legacy LAM template verbatim:
 *   "[ A17 ] APDS - EMP 84 months @ 9.66% per Annum"
 * or "[ C02 ] … 720 days @ …" when the policy count doesn't describe the
 * term (single-payment products).
 *
 * Backend mirror: (none — display-only)
 */
export function buildProductLine(
    productCode: string | null | undefined,
    productDisplay: string,
    approvalTermDays: number,
    policyTermMonths: number | null | undefined,
    ratePercent: number,
): string {
    const termLabel =
        policyTermMonths &&
        policyTermMonths > 0 &&
        Math.abs(policyTermMonths * DAYS_PER_MONTH - approvalTermDays) <= GRACE_TOLERANCE_DAYS
            ? `${policyTermMonths} months`
            : `${approvalTermDays.toLocaleString()} days`;

    // Legacy template quotes the product code in brackets before the
    // description; orphaned/retired rows without a parsable code fall
    // back to the bare description rather than printing "[  ]".
    const codePrefix = productCode?.trim() ? `[ ${productCode.trim()} ] ` : "";

    return `${codePrefix}${productDisplay} ${termLabel} @ ${formatRatePercent(ratePercent)}% per Annum`;
}

/**
 * Compute the financial metrics rendered in the printed Approval Form
 * for a single selected loan. Multi-loan applications run this once
 * per loan in `data.loans[]` and render one document each.
 *
 * Backend is the source of truth — these numbers are UI-only.
 * Compliance / accounting must always re-derive the figures from the
 * canonical ledger entries, never from these snapshots.
 *
 * @param productFees Optional product-specific fee config from the
 *   LoanProduct table. When provided, overrides the legacy hardcoded
 *   6% / ₱500 defaults so the approval form matches the product's
 *   actual policy (e.g. C23 @ 6.5%, C35 @ 7.5%).
 */
export function computeLoanMetrics(
    primaryLoan: SelectedLoan,
    obligations: {
        outstandingLoans: LoanApplicationFormData["outstandingLoans"];
        ebiReloans: SelectedLoan["ebiReloans"];
        buyOuts: SelectedLoan["buyOuts"];
        incomingLoans: SelectedLoan["incomingLoans"];
        client: LoanApplicationFormData["client"];
    },
    productFees?: ProductFeeConfig,
) {
    const { outstandingLoans, ebiReloans, buyOuts, incomingLoans, client } = obligations;
    const params = primaryLoan.parameters;

    const totalBalance = outstandingLoans.reduce((s, l) => s + (l.outstandingBalance || 0), 0);
    const totalPrincipal = outstandingLoans.reduce((s, l) => s + (l.principalBalance || 0), 0);
    const ebiDeductions = ebiReloans.reduce((s, r) => s + (r.existingDeduction || 0), 0);
    const ebiOb = ebiReloans.reduce((s, r) => s + (r.outstandingBalance || 0), 0);
    const buyOutDeductions = buyOuts.reduce((s, b) => s + (b.amortization || 0), 0);
    const buyOutBalance = buyOuts.reduce((s, b) => s + (b.outstandingBalance || 0), 0);
    const incomingTotal = incomingLoans.reduce((s, i) => s + (i.deductions || 0), 0);

    // `termDays` is the raw feed value; `approvalTermDays` is the
    // frozen-or-resolved value used for all PMT / MLA math.
    const termDays = params.term || 0;
    const approvalTermDays =
        primaryLoan.approvalTermDays
        ?? resolveApprovalTermDays(termDays, params.policyTermMonths);
    const annualRatePercent =
        primaryLoan.annualRatePercent
        ?? toAnnualRatePercent(params.interestRate);

    const principal = params.proposedAmount || 0;

    // Fee computation — use product-specific rates when available,
    // fall back to legacy hardcoded defaults for backward compatibility.
    //
    // `applicationChargeRate` from the LoanProduct table is the TOTAL
    // deduction rate (e.g. 6% for A16, 6.5% for C23, 7.5% for C35).
    // Application charge is the residual plug — matching the backend's
    // FixedTotalRate mode and the Excel template formula:
    //   Application Charge = (principal × rate) - docStamp - notarial - insurance
    const totalDeductionRate = productFees?.applicationChargeRate ?? LEGACY_TOTAL_DEDUCTION_RATE;
    const notarialFee = productFees?.notarialFee ?? LEGACY_NOTARIAL_FEE;
    const insurance = productFees?.insuranceFee ?? 0;

    // Doc. Stamp is the frozen webloan c_doc_stamp — never regenerate at 0.75%.
    const docStamp = primaryLoan.cDocStamp ?? 0;

    // Advance interest: only charged when the product flag is set.
    const advanceInterest = productFees?.chargeAdvanceInterest
        ? principal * (productFees.advanceInterestRate || 0) * (approvalTermDays / 360)
        : 0;

    const deductionsSubtotal = principal * totalDeductionRate;
    const applicationCharge = Math.max(0, deductionsSubtotal - docStamp - notarialFee - insurance - advanceInterest);
    const deductionPct = principal > 0 ? (deductionsSubtotal / principal) * 100 : 0;

    const grossProceeds = principal - deductionsSubtotal;
    const netProceedsDs = grossProceeds - ebiOb;
    const netProceedsClient = netProceedsDs - buyOutBalance;
    const totalExposure = principal + totalPrincipal;

    const amortization = computeMonthlyAmortization(principal, annualRatePercent, approvalTermDays);

    const nthp = client.netTakeHomePay || 0;
    const netPayAfterDeduction = nthp - amortization + ebiDeductions + buyOutDeductions;
    const totalMonthlyIncome = netPayAfterDeduction;

    // Capacity-to-pay block, mirroring the legacy template:
    //   Total Disposable   = NTHP + reloan deductions released + buy-out deductions released
    //   Less: Minimum NTHP = policy floor the borrower retains (₱5,000)
    //   Total Deductions   = that floor + incoming/undeducted deductions
    //   Total Disposable   = net capacity feeding the MLA PV
    const totalDisposableGross = nthp + ebiDeductions + buyOutDeductions;
    const minimumNthp = DEFAULT_MINIMUM_NTHP;
    const totalDeductionsFinal = minimumNthp + incomingTotal;
    const totalDisposableNet = totalDisposableGross - totalDeductionsFinal;

    // Capacity-to-pay ceiling — see computeMaximumLoanableAmount docs.
    const productCode = parseProductCode(params.product);
    const maximumLoanableAmount = computeMaximumLoanableAmount(
        totalDisposableNet,
        annualRatePercent,
        approvalTermDays,
        productCode
    );

    return {
        termDays,
        approvalTermDays,
        annualRatePercent,
        amortization,
        applicationCharge,
        docStamp,
        notarialFee,
        insurance,
        advanceInterest,
        deductionsSubtotal,
        deductionPct,
        grossProceeds,
        netProceedsDs,
        netProceedsClient,
        totalExposure,
        totalBalance,
        totalPrincipal,
        ebiDeductions,
        ebiOb,
        buyOutDeductions,
        buyOutBalance,
        incomingTotal,
        nthp,
        netPayAfterDeduction,
        totalMonthlyIncome,
        totalDisposableGross,
        minimumNthp,
        totalDeductionsFinal,
        totalDisposableNet,
        maximumLoanableAmount,
    };
}

// ── Printed obligation rows ─────────────────────────────────────────
// The legacy Excel template reserved fixed blank rows for the reloan /
// buy-out / incoming matrices. Printing those placeholders on the digital
// form wasted half a sheet and pushed the page-1 grid across the page
// boundary (the "page is cut" defect). Both print surfaces
// (`approval-form-document.tsx`, `approval-form-preview.tsx`) therefore
// render an obligation block only when it carries at least one row with
// values.

/** A reloan row prints nothing when it has no identifier and no amounts. */
export function isBlankReloan(row: EbiReloan): boolean {
    return (
        !row.name?.trim() &&
        !row.pn?.trim() &&
        !row.existingDeduction &&
        !row.outstandingBalance
    );
}

/** A buy-out row prints nothing when it has no identifier and no amounts. */
export function isBlankBuyOut(row: BuyOut): boolean {
    return (
        !row.name?.trim() &&
        !row.pn?.trim() &&
        !row.amortization &&
        !row.outstandingBalance
    );
}

/** An incoming row prints nothing when it has no name/remarks and no deduction. */
export function isBlankIncomingLoan(row: IncomingLoan): boolean {
    return !row.name?.trim() && !row.remarks?.trim() && !row.deductions;
}

/**
 * Rows worth printing for an obligation matrix. Blank wizard placeholders
 * are dropped so empty sections collapse instead of printing dash rows.
 * Total-safe: every dropped field is zero/empty, so `computeLoanMetrics`
 * sums are unchanged whether it sees the raw or the filtered list.
 */
export function printableObligationRows<T>(
    rows: readonly T[] | undefined,
    isBlank: (row: T) => boolean,
): T[] {
    return (rows ?? []).filter((row) => !isBlank(row));
}

// ── Printed deviation entries ───────────────────────────────────────
// The approval form's "Deviations:" box now prints each declared reason
// with its per-deviation remark underneath. The fee-override deviation
// (synthetic — originates from fee fields, not catalog checkboxes) is
// appended last.

/**
 * Mirror of the backend's `LoanDeviation.FeeOverrideReason`
 * (EBI.ALAS.Api/Features/Loans/LoanDeviation.cs). The fee override is a
 * synthetic deviation — it originates from the fee fields, not the catalog
 * checkboxes — but it prints and routes as a deviation, so both stacks must
 * spell it identically.
 */
export const FEE_OVERRIDE_REASON =
    "Fee override (notarial / doc stamps / insurance)";

export interface PrintableDeviationEntry {
    reason: string;
    /** The specific remark for THIS deviation (trimmed); "" when none captured. */
    remark: string;
    isFeeOverride: boolean;
}

/** Structural view of `DeviationsData` — keeps this util free of schema imports. */
export interface PrintableDeviationSource {
    hasDeviations?: boolean;
    deviationDetails?: string[];
    deviationJustifications?: Record<string, string>;
    feeDeviationJustification?: string;
}

/**
 * Assembles the "Deviations:" box of the printed approval form: one entry per
 * declared deviation, each carrying its specific remark, with the synthetic
 * fee-override deviation appended last. Mirrors the backend's
 * `LoanSubmissionService.BuildDeviationRows` so the create-page preview, the
 * approval-page document, and the stored `LoanDeviation` rows never disagree.
 *
 * `hasDeviations` is deliberately ignored — same as the backend: the rows are
 * derived from the declared reasons + fee justification, so a tampered flag
 * cannot hide a deviation from the printout.
 */
export function buildPrintableDeviationEntries(
    deviations: PrintableDeviationSource | undefined,
): PrintableDeviationEntry[] {
    if (!deviations) return [];

    const seen = new Set<string>();
    const entries: PrintableDeviationEntry[] = [];
    for (const reason of deviations.deviationDetails ?? []) {
        if (seen.has(reason)) continue; // tolerate dupes in legacy snapshots
        seen.add(reason);
        entries.push({
            reason,
            remark: (deviations.deviationJustifications?.[reason] ?? "").trim(),
            isFeeOverride: false,
        });
    }

    const feeRemark = (deviations.feeDeviationJustification ?? "").trim();
    if (feeRemark.length > 0) {
        entries.push({
            reason: FEE_OVERRIDE_REASON,
            remark: feeRemark,
            isFeeOverride: true,
        });
    }

    return entries;
}
