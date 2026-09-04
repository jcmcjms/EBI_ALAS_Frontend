/**
 * Pure utility functions for EBI ALAS loan computations.
 *
 * Mirrors the logic from the legacy LAM Excel templates:
 *   • `computeMonthlyAmortization` — standard amortizing-loan payment
 *     formula (PMT), used both for the real-time validation gate and
 *     for the Approval Form preview's `Monthly Amortization` line.
 *   • `getMinimumRequiredAmortization` — the tiered minimum-payment
 *     table the AO is checked against before submission. Encoded
 *     verbatim from the spreadsheet so the wizard's error message
 *     matches the printed form 1:1.
 *   • `computeLoanMetrics` — orchestration of the above plus the
 *     "Total Disposable" / "Net Proceeds" derivations, exposed
 *     through `useLoanComputations` to the form and the preview.
 *
 * ─── Banking rigor ────────────────────────────────────────────────────
 * JavaScript's `Number` is IEEE 754 double-precision. `Math.round` to
 * 2dp is **sufficient for UI projections** but **must not** be used for
 * the final promissory note or ledger entry on the backend — the .NET
 * API uses `decimal` for all financial math, and is the authoritative
 * source of truth (see `OutstandingLoansResponse.amortAmount`). The
 * frontend's role is strictly validation, preview, and capacity-to-pay
 * hints.
 *
 * The functions here are deliberately dependency-free so they are
 * trivial to unit test under Vitest and can be reused inside Zod
 * `superRefine` schemas (the validator must not pull React).
 */

// ── Cross-file type boundary ──────────────────────────────────────────
//
// We deliberately do NOT import types from `@/pages/loans/create/schema`
// here, even though this file is consumed by that schema's
// `superRefine`. The reason is a circular import under
// `verbatimModuleSyntax`: the schema imports the engine for its
// validation rules, and the engine would import the schema for its
// type definitions. The TS resolver collapses the cycle into "module
// not found" at build time. Defining the types locally below keeps the
// dependency graph acyclic at the type level while the runtime call
// stays identical.
//
// The structural types here mirror the schema fields the math reads.
// Any drift between these and the schema is caught at the call site
// (the snapshot builder's `Pick`-style access will fail to type-check).

/** Minimal structural view of `client.netTakeHomePay`. */
export type NthpCarrier = { netTakeHomePay?: number };

/** Minimal structural view of `loan.{proposedAmount, interestRate, term}`. */
export type LoanParamsCarrier = {
    proposedAmount?: number;
    interestRate?: number;
    term?: number;
};

/** Minimal structural view of an `outstandingLoans[i]` row. */
export type OutstandingLoanCarrier = { outstandingBalance?: number; principalBalance?: number };

/** Minimal structural view of an `ebiReloans[i]` row. */
export type EbiRowCarrier = { outstandingBalance?: number; existingDeduction?: number };

/** Minimal structural view of a `buyOuts[i]` row. */
export type BuyOutRowCarrier = { outstandingBalance?: number };

/** Minimal structural view of an `incomingLoans[i]` row. */
export type IncomingRowCarrier = { deductions?: number };

/** Minimal structural view of the form slices the snapshot reads. */
export type FormCarrier = {
    loan?: LoanParamsCarrier;
    client?: NthpCarrier;
    outstandingLoans?: readonly OutstandingLoanCarrier[];
    ebiReloans?: readonly EbiRowCarrier[];
    buyOuts?: readonly BuyOutRowCarrier[];
    incomingLoans?: readonly IncomingRowCarrier[];
};

// ── Input contracts ────────────────────────────────────────────────────
//
// Two flavours are exported so callers can compose them in the way
// that fits their shape:
//
//   1. `LoanComputationInputs` — flat, scalar, ready to test. Use this
//      when calling from a Zod `superRefine` or a Vitest suite where
//      there is no RHF context.
//   2. `LoanMetricsSnapshot` — derives inputs from the actual form
//      shape (`LoanApplicationFormData`) so the hook can be a thin
//      pass-through and the math stays pure.

// Flat inputs (call directly from tests / schemas).
export interface LoanComputationInputs {
    /** Principal / proposed loan amount in PHP. */
    principal: number;
    /** Nominal annual interest rate, in percent (e.g. 7.0 for 7%). */
    annualRatePercent: number;
    /** Term in days. */
    termDays: number;
    /**
     * Upfront application charge as a fraction of `principal`
     * (e.g. 0.06 for 6%). In production this should be sourced from
     * the selected Loan Product DTO — see the warning in the
     * architecture note about the A16 product defaulting to 6%.
     */
    applicationChargeRate: number;
    /** Documentary stamp tax in PHP (e.g. `principal * 0.0075`). */
    docStamp: number;
    /** Notarial fee in PHP (flat). */
    notarialFee: number;
    /** Insurance / MRI in PHP. */
    insurance: number;
    /** Advance interest in PHP. */
    advanceInterest: number;
    /**
     * Outstanding balance of EBI accounts to be settled by this loan
     * (the "Total Accounts Balance" line on the approval form).
     */
    outstandingBalance: number;
    /**
     * Outstanding balance of buy-out accounts from other FIs
     * (the "Total Buy-Out Balance" line on the approval form).
     */
    buyOutBalance: number;
}

/**
 * Aggregated "per-cycle" obligations that the AO declares on the form.
 *
 * `otherMonthlyObligations` is the AO's hand-keyed catch-all for any
 * recurring monthly obligation that isn't already captured by an EBI
 * reloan, buy-out, or incoming/undeducted row. It exists on the form
 * to make the capacity-to-pay math match what the AO actually sees in
 * their underwriting notes.
 */
export interface DisposableIncomeInputs {
    /** Net Take-Home Pay in PHP. */
    nthp: number;
    /** Other recurring monthly income the AO is willing to count. */
    otherIncome: number;
    /** Other monthly obligations (rent, household, etc.). */
    otherMonthlyObligations: number;
}

// ── Output contract ────────────────────────────────────────────────────

export interface LoanComputationResults {
    monthlyAmortization: number;
    applicationCharge: number;
    totalUpfrontDeductions: number;
    grossProceeds: number;
    netProceeds: number;
    /** Monthly amortization + `otherMonthlyObligations`. */
    totalMonthlyObligations: number;
    /** `(nthp + otherIncome) - totalMonthlyObligations`. */
    totalDisposable: number;
    /** True when `totalDisposable < 0`. Drives the Zod gate. */
    isAmortizationExceedingDisposable: boolean;
    /** Looked up from the tiered table; `0` for amounts below the floor. */
    minimumRequiredAmortization: number;
}

// ── Math ───────────────────────────────────────────────────────────────

/**
 * Standard PMT (amortizing payment) for a fixed-rate, fully-amortizing
 * loan.
 *
 * @param principal loan principal in PHP.
 * @param annualRatePercent nominal APR in percent (e.g. 7.5 for 7.5%).
 * @param termDays term in days (the loan term throughout the system is
 *                 days; the engine internally converts to monthly
 *                 periods because the PMT formula is parameterized in
 *                 months — converting at the boundary keeps the API
 *                 shape uniform).
 * @returns monthly payment, rounded to 2 decimal places. Returns 0
 *          for non-positive principal or term.
 */
export function computeMonthlyAmortization(
    principal: number,
    annualRatePercent: number,
    termDays: number,
): number {
    if (!Number.isFinite(principal) || !Number.isFinite(annualRatePercent) || !Number.isFinite(termDays)) {
        return 0;
    }
    if (principal <= 0 || termDays <= 0) return 0;
    // Convert days → months. Using 30 days per month keeps the legacy
    // "1 month = 30 days" convention the rest of the system (preloan
    // totalTermDays, approval-form preview, etc.) already uses, so the
    // engine output matches what the printed form shows.
    const termMonths = Math.floor(termDays / 30);
    if (termMonths <= 0) return 0;
    if (annualRatePercent === 0) return round2(principal / termMonths);

    const r = annualRatePercent / 100 / 12;
    const n = termMonths;
    const pmt = (principal * r) / (1 - Math.pow(1 + r, -n));

    return round2(pmt);
}

/**
 * Tiered minimum-payment table (mirrors the Excel's "Min Amort" lookup
 * column). Loan amounts below 100k have no minimum.
 *
 * Tier table (PHP):
 *   < 100,000           → no minimum
 *   100,000 – 110,000   → 3,000
 *   110,001 – 130,000   → 3,500
 *   130,001 – 145,000   → 4,000
 *   145,001 – 165,000   → 4,500
 *   165,001 – 200,000   → 5,000
 *   > 200,000           → 5,000 + 500 per additional ₱20,000 (rounded up)
 *
 * @param loanAmount Proposed loan amount in PHP.
 * @returns Minimum monthly amortization in PHP, or 0 for amounts below
 *          the floor.
 */
export function getMinimumRequiredAmortization(loanAmount: number): number {
    if (!Number.isFinite(loanAmount) || loanAmount < 100_000) return 0;
    if (loanAmount <= 110_000) return 3_000;
    if (loanAmount <= 130_000) return 3_500;
    if (loanAmount <= 145_000) return 4_000;
    if (loanAmount <= 165_000) return 4_500;
    if (loanAmount <= 200_000) return 5_000;

    // >200k: 5k base + 500 per ₱20k of overage (Excel uses CEILING on
    // the overage / 20k step).
    const overage = loanAmount - 200_000;
    return 5_000 + Math.ceil(overage / 20_000) * 500;
}

/**
 * Orchestrates the full set of derived metrics from the loan terms
 * and the borrower's disposable income.
 *
 * Pure: every input is passed as an argument; the function reads no
 * module state, no globals, and no React context.
 */
export function computeLoanMetrics(
    loanInputs: LoanComputationInputs,
    incomeInputs: DisposableIncomeInputs,
): LoanComputationResults {
    const {
        principal,
        annualRatePercent,
        termDays,
        applicationChargeRate,
        docStamp,
        notarialFee,
        insurance,
        advanceInterest,
        outstandingBalance,
        buyOutBalance,
    } = loanInputs;

    const monthlyAmortization = computeMonthlyAmortization(
        principal,
        annualRatePercent,
        termDays,
    );

    const applicationCharge = round2(principal * applicationChargeRate);
    const totalUpfrontDeductions = round2(
        applicationCharge + docStamp + notarialFee + insurance + advanceInterest,
    );

    const grossProceeds = round2(principal - totalUpfrontDeductions);
    // The Excel's "Net Proceeds to Client" subtracts the EBI OB first,
    // then the buy-out balance. Keep that two-step order so the printed
    // form matches the legacy template line-for-line.
    const netProceeds = round2(grossProceeds - outstandingBalance - buyOutBalance);

    const totalMonthlyObligations = round2(
        monthlyAmortization + (incomeInputs.otherMonthlyObligations || 0),
    );
    const totalDisposable = round2(
        (incomeInputs.nthp || 0) + (incomeInputs.otherIncome || 0) - totalMonthlyObligations,
    );

    return {
        monthlyAmortization,
        applicationCharge,
        totalUpfrontDeductions,
        grossProceeds,
        netProceeds,
        totalMonthlyObligations,
        totalDisposable,
        // The Excel prints the difference (income - obligations); a
        // negative total means the AO has overrun the borrower's
        // capacity to pay.
        isAmortizationExceedingDisposable: totalDisposable < 0,
        minimumRequiredAmortization: getMinimumRequiredAmortization(principal),
    };
}

// ── RHF bridge ─────────────────────────────────────────────────────────
//
// `LoanMetricsSnapshot` adapts the actual `LoanApplicationFormData`
// shape to the flat inputs the engine expects. The hook in
// `src/hooks/use-loan-computations.ts` is a thin wrapper over
// `useMemo(snapshot)` + `computeLoanMetrics` — keeping the snapshot
// builder pure means the engine stays testable without RHF.

/**
 * A minimal read-only view of the loan form's relevant slices.
 * Mirrors the slices the hook actually subscribes to via `useWatch`.
 *
 * The shape is intentionally narrow: only the fields the engine reads.
 * Callers (the hook, the schema's `superRefine`) are expected to
 * supply a structurally-compatible subset of `LoanApplicationFormData`.
 */
export interface LoanMetricsSnapshot {
    loan: LoanParamsCarrier;
    client: NthpCarrier;
    outstandingLoans: readonly OutstandingLoanCarrier[];
    ebiReloans: readonly EbiRowCarrier[];
    buyOuts: readonly BuyOutRowCarrier[];
    incomingLoans: readonly IncomingRowCarrier[];
    /** Optional override — defaults to 6% when not supplied. */
    applicationChargeRate?: number;
}

/**
 * Snapshot builder: collapses the form's array-shaped obligations into
 * the scalar inputs the engine expects. The defaults match the legacy
 * Excel's blank-cell behaviour (zero), so a partially-filled form
 * computes the same as the AO leaving a cell empty.
 */
export function buildLoanMetricsSnapshot(
    form: FormCarrier,
    applicationChargeRate = 0.06,
): {
    loan: LoanComputationInputs;
    income: DisposableIncomeInputs;
} {
    const principal = form.loan?.proposedAmount || 0;
    const annualRatePercent = form.loan?.interestRate || 0;
    const termDays = form.loan?.term || 0;

    // The Excel's "Total Accounts Balance" line is the EBI reloan OB
    // (not the raw WebLoan outstanding feed — those are listed under
    // "Outstanding Loans" and are not subtracted from gross proceeds).
    const outstandingBalance = (form.ebiReloans ?? []).reduce(
        (sum: number, row) => sum + (row?.outstandingBalance || 0),
        0,
    );

    const buyOutBalance = (form.buyOuts ?? []).reduce(
        (sum: number, row) => sum + (row?.outstandingBalance || 0),
        0,
    );

    // The "other monthly obligations" aggregate isn't currently
    // surfaced as a single form input — it lives implicitly across the
    // incoming/undeducted loans and the AO's manual notes. We sum the
    // incoming-loan deductions as a conservative proxy so the
    // capacity-to-pay check matches what the printed page hints at.
    const otherMonthlyObligations = (form.incomingLoans ?? []).reduce(
        (sum: number, row) => sum + (row?.deductions || 0),
        0,
    );

    return {
        loan: {
            principal,
            annualRatePercent,
            termDays,
            applicationChargeRate,
            // TODO(product-config): once the Loan Product DTO is wired
            // through TanStack Query, replace these zeros with the
            // values returned by the selected product (A16 currently
            // hard-codes 6% application charge + 0.75% doc stamp +
            // 500 notarial fee in the approval form preview).
            docStamp: 0,
            notarialFee: 0,
            insurance: 0,
            advanceInterest: 0,
            outstandingBalance,
            buyOutBalance,
        },
        income: {
            nthp: form.client?.netTakeHomePay || 0,
            otherIncome: 0,
            otherMonthlyObligations,
        },
    };
}

// ── helpers ────────────────────────────────────────────────────────────

/** Round to 2 decimal places using banker-neutral half-away-from-zero. */
function round2(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
}