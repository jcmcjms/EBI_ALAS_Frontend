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
import { computeMaximumLoanableAmount } from "./loan-computations";
import type {
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
 */
export function computeLoanMetrics(
    primaryLoan: SelectedLoan,
    obligations: {
        outstandingLoans: LoanApplicationFormData["outstandingLoans"];
        ebiReloans: SelectedLoan["ebiReloans"];
        buyOuts: SelectedLoan["buyOuts"];
        incomingLoans: SelectedLoan["incomingLoans"];
        client: LoanApplicationFormData["client"];
    }
) {
    const { outstandingLoans, ebiReloans, buyOuts, incomingLoans, client } = obligations;
    const params = primaryLoan.parameters;

    const totalBalance = outstandingLoans.reduce((s, l) => s + (l.outstandingBalance || 0), 0);
    const totalPrincipal = outstandingLoans.reduce((s, l) => s + (l.principalBalance || 0), 0);
    const ebiDeductions = ebiReloans.reduce((s, r) => s + (r.existingDeduction || 0), 0);
    const ebiOb = ebiReloans.reduce((s, r) => s + (r.outstandingBalance || 0), 0);
    const buyOutBalance = buyOuts.reduce((s, b) => s + (b.outstandingBalance || 0), 0);
    const incomingTotal = incomingLoans.reduce((s, i) => s + (i.deductions || 0), 0);

    const termDays = params.term || 0;
    const termMonths = Math.floor(termDays / 30);
    const monthlyRate = (params.interestRate || 0) / 100 / 12;
    const amortization =
        termMonths > 0 && monthlyRate > 0
            ? (params.proposedAmount * (monthlyRate * (1 + monthlyRate) ** termMonths)) / ((1 + monthlyRate) ** termMonths - 1)
            : 0;

    const applicationCharge = params.proposedAmount * 0.0504;
    const docStamp = params.proposedAmount * 0.0075;
    const notarialFee = 500;
    const deductionsSubtotal = applicationCharge + docStamp + notarialFee;
    const deductionPct = params.proposedAmount > 0 ? (deductionsSubtotal / params.proposedAmount) * 100 : 0;

    const grossProceeds = params.proposedAmount - deductionsSubtotal;
    const netProceedsDs = grossProceeds - ebiOb;
    const netProceedsClient = netProceedsDs - buyOutBalance;
    const totalExposure = params.proposedAmount + totalPrincipal;

    const nthp = client.netTakeHomePay || 0;
    const netPayAfterDeduction = nthp - amortization + ebiDeductions;
    const totalMonthlyIncome = netPayAfterDeduction;

    // Capacity-to-pay block, mirroring the legacy template:
    //   Total Disposable   = NTHP + reloan deductions released
    //   Less: Minimum NTHP = policy floor the borrower retains (₱5,000)
    //   Total Deductions   = that floor + incoming/undeducted deductions
    //   Total Disposable   = net capacity feeding the MLA PV
    const totalDisposableGross = nthp + ebiDeductions;
    const minimumNthp = DEFAULT_MINIMUM_NTHP;
    const totalDeductionsFinal = minimumNthp + incomingTotal;
    const totalDisposableNet = totalDisposableGross - totalDeductionsFinal;

    // Capacity-to-pay ceiling — see computeMaximumLoanableAmount docs.
    const productCode = parseProductCode(params.product);
    const maximumLoanableAmount = computeMaximumLoanableAmount(
        totalDisposableNet,
        params.interestRate || 0,
        termDays,
        productCode
    );

    return {
        termDays,
        amortization,
        applicationCharge,
        docStamp,
        notarialFee,
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
