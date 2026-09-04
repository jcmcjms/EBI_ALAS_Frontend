import { z } from "zod";

import {
    buildLoanMetricsSnapshot,
    computeMonthlyAmortization,
    getMinimumRequiredAmortization,
} from "@/src/lib/loan-computations";

/**
 * Typed view of the backend's `loan_data.creation_type` byte — the
 * canonical list is a hard-coded `CASE` block on the .NET side (see
 * `WebLoanRegions.CreationTypeLabel`), not driven by any lookup
 * table. We mirror it here so the form has a single typed source
 * for the codes (schema, label map, and "should-hide-Section-4"
 * predicate all consume these constants).
 */
export const CREATION_TYPE = {
    NEW_LOAN: 0,
    RELOAN: 1,
    RESTRUCTURED: 2,
    ADDITIONAL_LOAN: 6,
} as const;

/** Mirror of the backend's `CreationTypeLabel` switch (verbatim). */
export const CREATION_TYPE_LABELS: Record<
    (typeof CREATION_TYPE)[keyof typeof CREATION_TYPE],
    string
> = {
    [CREATION_TYPE.NEW_LOAN]: "New Loan",
    [CREATION_TYPE.RELOAN]: "Reloan",
    [CREATION_TYPE.RESTRUCTURED]: "Restructured",
    [CREATION_TYPE.ADDITIONAL_LOAN]: "Additional Loan",
};

/**
 * True when the picked preloan's creation type means the borrower's
 * existing loan portfolio has *not* been acquired by another FI —
 * i.e. the new application is a fresh acquisition (new loan) or
 * sits alongside an existing one (additional loan). In both cases
 * the AO should not be asked to re-list the borrower's outstanding
 * obligations from the WebLoan feed, and Section 4 ("Outstanding
 * Loans") is hidden in the wizard.
 *
 * The codes live on the backend as a `byte?`; the frontend
 * narrows them via `creationTypeCodeSchema` so this predicate
 * receives a typed value (or `null`).
 *
 * `null` (no preloan picked yet, or the joined `loan_data` row
 * was missing on the backend) defaults to **showing** Section 4 —
 * the conservative behavior the wizard had before this change.
 */
export const HidesOutstandingLoans = (
    code: CreationTypeCode | null | undefined
): boolean =>
    code === CREATION_TYPE.NEW_LOAN ||
    code === CREATION_TYPE.ADDITIONAL_LOAN;

// ── Branch & Type ──────────────────────────────────────────────
//
// `creationTypeCode` is the *typed* backend code from
// loan_data.creation_type. The backend ships a raw `byte?` and maps
// it to a human label on the same `PendingLoanDto` (see
// `src/lib/api/types.ts` for the contract). The valid set is:
//   0 = New Loan
//   1 = Reloan
//   2 = Restructured
//   6 = Additional Loan
// Anything else (including an unrecognized future code) is rejected
// at parse time by `zodResolver` — the schema hard-blocks. `null` is
// the "no preloan picked yet" state and is accepted by the schema;
// the wizard's own gating (`isComplete` / `canSubmit`) refuses to
// submit until one of the four known codes is set.
//
// `creationTypeLabel` is the humanized string from the same DTO
// (e.g. "New Loan"). Kept separately so:
//   - Section 1.2 ("Branch & type") can render the read-only label
//     without re-deriving it from the code, and
//   - the printed approval form (Sections 8 / approval-form-document)
//     shows the label the AO expects to see.
//
// `loanType` (the previous free-form string field) was removed: the
// hide-condition for Section 4 ("Outstanding Loans") and the
// step-3-completion check both need the *code*, not the label, and
// keeping both representations in lockstep on the form lets us detect
// drift (e.g. label set without code) at the type level.
export const creationTypeCodeSchema = z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(6),
    z.null(),
]);

export const branchTypeSchema = z.object({
    creationTypeCode: creationTypeCodeSchema,
    // Required so the schema's input shape matches the form's
    // `defaultValues` (which always sets this to `""` on mount); a
    // `.default("")` here would make the field optional on input and
    // cause a resolver type-mismatch with `useForm`/`useFormContext`.
    // Both writers (`active-loans-table.tsx` on loan pick and account
    // switch, `cis-lookup.tsx` on clear / search result) always set
    // it, so the required-ness is safe.
    creationTypeLabel: z.string(),
    branch: z.string().min(1, "Branch is required"),
    requestingOfficer: z.string().min(1, "Requesting officer is required"),
    lai: z.string().optional(), // Loan Application Index
});

// ── Client / CIS Info ──────────────────────────────────────────
export const clientSchema = z.object({
    cisId: z.string().min(1, "CIS ID is required"),
    firstName: z.string().min(1, "First name is required"),
    middleName: z.string().optional(),
    lastName: z.string().min(1, "Last name is required"),
    suffix: z.string().optional(),
    birthdate: z.string().optional(),
    address: z.string().optional(),
    agency: z.string().min(1, "Agency is required"),
    position: z.string().optional(),
    employeeId: z.string().optional(),
    netTakeHomePay: z.number().min(0, "NTHP must be positive").optional(),
    lengthOfService: z.string().optional(),
    region: z.string().optional(),
    divisionCode: z.string().optional(),
    stationCode: z.string().optional(),
    misAgency: z.string().optional(),

    // --- NEW FIELDS (Manual Entry) ---
    school: z.string().max(200, "School name must not exceed 200 characters").optional(),
    referrer: z.string().max(100, "Referrer name must not exceed 100 characters").optional(),
});

// ── Outstanding Loan (existing obligation) ─────────────────────
//
// `productWithDescription` is a frontend-only carry-over: the backend's
// `OutstandingLoanDto.productWithDescription` (e.g. "C35 - Quick Loan")
// is the *product description* we want to surface as the EBI reloan's
// `name` when a row is transferred from Outstanding → EBI Reloans.
// We persist it on the row so the transfer in `mapToEbi` has access to
// it without a re-fetch; it is optional because:
//   1. manually-added outstanding rows (none today, but possible) may
//      not have a product description attached, and
//   2. Zod's default object() strips unknown keys at parse time, so
//      making the field declared-but-optional is required to survive a
//      round-trip through `zodResolver` for any submit / reset cycle.
//
// `status` is kept as a separate field for the existing "Status" column
// in the obligations table — it is the loan's *status* label
// (e.g. "Active"), distinct from the *product description*.
export const outstandingLoanSchema = z.object({
    pn: z.string(),
    principalBalance: z.number().default(0),
    amortization: z.number().default(0),
    outstandingBalance: z.number().default(0),
    dateGranted: z.string().optional(),
    dateMaturity: z.string().optional(),
    status: z.string().default("Active"),
    productWithDescription: z.string().optional(),
});

// ── Preloan (CIS + Account + bch) ───────────────────────────────
// Selected by the AO at step 3 of the wizard. The `bch` of the
// returned row is server-asserted to equal the acting officer's
// branchId — the frontend never sets or trusts it directly.
export const preLoanRefSchema = z.object({
    id: z.number(),
    accountNo: z.string().min(1, "Account number is required"),
    bch: z.string().min(1, "Branch code is required"),
    formNumber: z.string().optional(),
    productDescription: z.string().optional(),
});

// ── EBI Reloan ─────────────────────────────────────────────────
//
// `payToClose` is the amount the AO intends to settle / buy-out on
// the reloan. It is a manually-entered number (not auto-derived
// from the CIS feed) and is validated against the outstanding
// balance via `superRefine` so that an entry larger than what is
// actually owed surfaces as a row-level validation error instead
// of silently shipping to the back-end.
export const ebiReloanSchema = z
    .object({
        pn: z.string().default(""),
        name: z.string().default(""),
        existingDeduction: z.number().default(0),
        outstandingBalance: z.number().default(0),
        payToClose: z
            .number()
            .min(0, "Pay to close must be a positive amount")
            .default(0),
    })
    .superRefine((row, ctx) => {
        if (row.payToClose > row.outstandingBalance) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["payToClose"],
                message: `Pay to close cannot exceed the outstanding balance of ${row.outstandingBalance.toLocaleString()}.`,
            });
        }
    });

// ── Buy-Out (from another FI) ──────────────────────────────────
export const buyOutSchema = z.object({
    pn: z.string().default(""),
    name: z.string().default(""),
    amortization: z.number().default(0),
    outstandingBalance: z.number().default(0),
});

// ── Incoming / Undeducted Loans ────────────────────────────────
export const incomingLoanSchema = z.object({
    name: z.string().default(""),
    deductions: z.number().default(0),
    remarks: z.string().default(""),
});

// ── Loan Parameters ────────────────────────────────────────────
//
// The fee fields (notarial / doc stamps / insurance) implement the
// "Smart Default with Editable Override" pattern:
//   - `max()` bounds are *sanity* checks (catch fat-finger ₱50000 vs ₱500),
//     not policy limits. The bank policy lives in `LoanProductResponse.fees[]`
//     and is enforced server-side — the schema can't know per-product
//     thresholds at parse time, so the *deviation-justification* rule
//     below catches the policy breach instead.
//   - `deviationJustification` lives at the *form* level (not per-field)
//     because the AO typically has one reason for any/all overrides
//     ("notary charged ₱750 because the docs were 4 pages instead of 2").
//   - The `standardFeesSnapshot` is *derived*, not entered — written by
//     the wizard from `computeExpectedFees(product, principal)` at the
//     moment the AO picks a product / changes the principal, so the
//     audit trail captures what the bank policy said *at that moment*.
//     The backend stores both numbers so Compliance can run "AO
//     override frequency" reports.
export const loanParametersSchema = z.object({
    product: z.string().min(1, "Loan product is required"),
    purpose: z.string().min(1, "Loan purpose is required"),
    proposedAmount: z
        .number()
        .min(1, "Proposed amount is required")
        .max(5_000_000, "Amount exceeds maximum allowed"),
    term: z.number().min(1, "Term must be at least 1 day").max(2555),
    interestRate: z.number().min(0).max(100).optional(),
    nthpDate: z.string().optional(),

    // ── Bank-fee fields (Smart Default + Editable Override) ─────
    // `.default(0)` matches the legacy form behavior — fees start at
    // zero and are auto-populated the moment a product is picked.
    notarialFee: z
        .number()
        .min(0, "Notarial fee cannot be negative")
        .max(50_000, "Notarial fee exceeds maximum allowable threshold")
        .default(0),
    docStamps: z
        .number()
        .min(0, "Doc stamps cannot be negative")
        .max(50_000, "Doc stamps exceeds maximum allowable threshold")
        .default(0),
    insurance: z
        .number()
        .min(0, "Insurance cannot be negative")
        .max(50_000, "Insurance exceeds maximum allowable threshold")
        .default(0),

    // ── Audit snapshot — what the bank policy expected ──────────
    // The wizard writes these on every (product, principal) change so
    // the backend stores *both* the AO's actual entry and the system's
    // expected value. Compliance uses the delta to detect training
    // gaps (one AO consistently types ₱500 for notarial on every loan
    // — probably a copy/paste error) and fraud patterns.
    standardFeesSnapshot: z
        .object({
            notarialFee: z.number().default(0),
            docStamps: z.number().default(0),
            insurance: z.number().default(0),
        })
        .default({ notarialFee: 0, docStamps: 0, insurance: 0 }),
});

// ── Verification Conducted ─────────────────────────────────────
// `findings` is required: the AO must record what was verified
// (employment, payslip, collateral, etc.) before the application can
// be submitted. Empty/whitespace-only input is rejected.
export const verificationSchema = z.object({
    findings: z
        .string()
        .trim()
        .min(1, "Findings are required. Document what was verified."),
});

// ── Deviations / Remarks ───────────────────────────────────────
//
// `hasDeviations` is the user-controlled toggle. When it is `true`,
// `deviationDetails` must contain at least one selected reason from
// the fixed catalogue — we enforce that with a `superRefine` rather
// than a plain `.min(1)` so a user who legitimately ticks the flag
// and then unticks it does not see a stale required-error on the
// (now empty) selection.
//
// `otherRemarks` is always required, even when there are no
// deviations, so the AO leaves a trace for downstream reviewers.
//
// `feeDeviationJustification` is conditionally required at the root
// schema's `superRefine` (see below) — *only* when one of the fee
// fields deviates from `standardFeesSnapshot` by more than the per-fee
// `maxAllowedDeviation` stored on the product rule. We mark it
// optional here so the per-field error path stays clean; the root
// superRefine attaches the cross-field error.
export const DEVIATION_REASONS = [
    "Age not within the prescribed parameters",
    "Discounted Application Fee",
    "Interest rate reduction",
    "Lacking bank statement of account",
    "Lacking CIBI",
    "Lacking marriage cert. with surname as single",
    "Lacking one or two payslip(s) for new atm loan",
    "Lacking signature in application form",
    "Lacking SPAs to claim ATM",
    "No appointment record and/or service record",
    "No FI SOA and loan ledger",
    "No interview sheet",
    "No latest payslip",
    "No orientation form or old form submitted",
    "No valid identification cards",
    "Total consumer loan exposure exceeding 1.2 million",
    "With blocked ATIM in same school",
    "With history of delinquency in the latest loan availment",
    "With NFIS findings",
    "With past due account - non performing loan",
    "With past due account - performing",
] as const;

export type DeviationReason = (typeof DEVIATION_REASONS)[number];

export const deviationsSchema = z
    .object({
        hasDeviations: z.boolean().default(false),
        // Free-form string → fixed enum[] of deviation reasons. The
        // wizard now surfaces a checkbox group from `DEVIATION_REASONS`
        // and stores the selected reasons verbatim so the printed
        // approval form renders them as a numbered list (1:, 2:, …)
        // rather than whatever the AO happened to type.
        deviationDetails: z
            .array(z.enum(DEVIATION_REASONS))
            .default([]),
        remarks: z.string().optional(),
        aoRecommendation: z.string().optional(),
        otherRemarks: z
            .string()
            .trim()
            .min(1, "Other remarks are required."),
        /**
         * Justification for any fee override (notarial / doc stamps /
         * insurance). Conditionally required at the root schema's
         * `superRefine` — see `loanApplicationSchema` below.
         *
         * Stored on the deviations bucket because it shares the same
         * audit-trail machinery as policy deviations: both end up on
         * the printed approval form under "Remarks".
         */
        feeDeviationJustification: z.string().trim().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.hasDeviations && data.deviationDetails.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["deviationDetails"],
                message:
                    "Select at least one deviation reason when the deviations flag is enabled.",
            });
        }
    });

// ── Full Loan Application ──────────────────────────────────────
//
// `loanApplicationSchema` is the root schema wired to `useForm`'s
// resolver. It carries two cross-field validation rules via
// `superRefine` — these are the legacy Excel's "Capacity to Pay"
// checks, encoded here so the AO can't submit a form that violates
// them (the .NET 8 backend re-runs the same checks authoritatively):
//
//   1. Monthly Amortization must not exceed Total Disposable Income.
//   2. Computed monthly amortization must meet (or exceed) the
//      minimum required for the proposed amount, per the tiered
//      lookup table in `@/src/lib/loan-computations`.
//
// Both rules are deliberately only enforced when the loan params
// are well-formed (positive principal, positive term). The
// `loanParametersSchema` already surfaces a top-level error for
// those, so we don't double-flag.
export const loanApplicationSchema = z
    .object({
        branchType: branchTypeSchema,
        client: clientSchema,
        loan: loanParametersSchema,
        outstandingLoans: z.array(outstandingLoanSchema).default([]),
        ebiReloans: z.array(ebiReloanSchema).default([]),
        buyOuts: z.array(buyOutSchema).default([]),
        incomingLoans: z.array(incomingLoanSchema).default([]),
        preLoan: preLoanRefSchema.optional(),
        // Both sections are required: the wizard seeds them with empty
        // strings in `loan-creation.tsx` so they always exist on mount.
        // Marking them required at the parent level ensures the
        // `.min(1)` constraints on `findings`, `otherRemarks`, and
        // (conditionally) `deviationDetails` are actually evaluated.
        verification: verificationSchema,
        deviations: deviationsSchema,
    })
    .superRefine((data, ctx) => {
        const { loan, client, ebiReloans, buyOuts, incomingLoans, deviations } = data;

        // Only run the cross-field rules when the underlying loan
        // parameters are themselves valid. The `loanParametersSchema`
        // already emits field-level issues for principal/term, so
        // piling capacity-to-pay errors on top of a `Term is required`
        // error would be noise.
        if (!loan?.proposedAmount || loan.proposedAmount <= 0) return;
        if (!loan?.term || loan.term <= 0) return;
        if (loan?.interestRate == null || loan.interestRate < 0) return;

        // The engine treats a 0% rate as "straight-line" amortization;
        // the rule still applies but produces a smaller payment.
        const monthlyAmortization = computeMonthlyAmortization(
            loan.proposedAmount,
            loan.interestRate,
            loan.term,
        );

        // Rule #2 first: the tiered minimum table is a hard floor for
        // any loan amount above ₱100k. Surface it on `term` so the
        // AO's eye lands on the column they can actually edit to
        // bring the payment up (longer term → smaller payment).
        const minimumAmortization = getMinimumRequiredAmortization(
            loan.proposedAmount,
        );
        if (minimumAmortization > 0 && monthlyAmortization < minimumAmortization) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["loan", "term"],
                message: `Computed amortization (${formatCurrency(
                    monthlyAmortization,
                )}) is below the minimum required (${formatCurrency(
                    minimumAmortization,
                )}) for this loan amount. Extend the term or reduce the principal.`,
            });
        }

        // Rule #1: capacity-to-pay. Aggregating the obligations into
        // the scalar inputs the engine expects keeps the rule logic
        // in one place — the same snapshot `useLoanComputations`
        // derives for the preview. We only consume the `income` slice
        // here because `loan` is already represented by
        // `monthlyAmortization` above (computed directly from the
        // form's loan params, which is the canonical value the engine
        // also returns).
        const { income } = buildLoanMetricsSnapshot({
            loan,
            client,
            outstandingLoans: data.outstandingLoans,
            ebiReloans,
            buyOuts,
            incomingLoans,
        });
        const totalMonthlyObligations =
            monthlyAmortization + (income.otherMonthlyObligations || 0);
        const totalDisposable =
            (income.nthp || 0) +
            (income.otherIncome || 0) -
            totalMonthlyObligations;

        if (totalDisposable < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["client", "netTakeHomePay"],
                message: `Monthly Amortization exceeds Total Disposable Income. Shortfall: ${formatCurrency(
                    Math.abs(totalDisposable),
                )}.`,
            });
        }

        // Rule #3: fee-deviation justification.
        //
        // If any of the three fee fields (notarial / doc stamps /
        // insurance) deviates from the `standardFeesSnapshot` that
        // the wizard wrote at the last (product, principal) change,
        // the AO must supply a `feeDeviationJustification`. The
        // snapshot lives on the form so the rule works without the
        // wizard having to re-fetch the product rule on submit.
        //
        // We use a 0.01 ₱ tolerance (matches `CurrencyInput`'s
        // `VALUE_TOLERANCE`) so floating-point noise doesn't trigger
        // the requirement. The *exact* per-product `maxAllowedDeviation`
        // threshold is enforced server-side — the backend is the
        // source of truth and the schema's job is just to refuse an
        // unjustified override at all.
        const snapshot = loan.standardFeesSnapshot ?? {
            notarialFee: 0,
            docStamps: 0,
            insurance: 0,
        };
        const FEES_TOLERANCE = 0.01;
        const hasFeeOverride =
            Math.abs((loan.notarialFee ?? 0) - (snapshot.notarialFee ?? 0)) >
                FEES_TOLERANCE ||
            Math.abs((loan.docStamps ?? 0) - (snapshot.docStamps ?? 0)) >
                FEES_TOLERANCE ||
            Math.abs((loan.insurance ?? 0) - (snapshot.insurance ?? 0)) >
                FEES_TOLERANCE;

        if (hasFeeOverride && !deviations?.feeDeviationJustification?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["deviations", "feeDeviationJustification"],
                message:
                    "Provide a justification — at least one fee deviates from the bank's standard rate.",
            });
        }
    });

// ── Inferred types ─────────────────────────────────────────────
export type BranchTypeData = z.infer<typeof branchTypeSchema>;
/** Typed view of the backend's `loan_data.creation_type` byte. */
export type CreationTypeCode = NonNullable<
    z.infer<typeof creationTypeCodeSchema>
>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type OutstandingLoan = z.infer<typeof outstandingLoanSchema>;
export type EbiReloan = z.infer<typeof ebiReloanSchema>;
export type BuyOut = z.infer<typeof buyOutSchema>;
export type IncomingLoan = z.infer<typeof incomingLoanSchema>;
export type PreLoanRef = z.infer<typeof preLoanRefSchema>;
export type LoanParameters = z.infer<typeof loanParametersSchema>;
export type VerificationData = z.infer<typeof verificationSchema>;
export type DeviationsData = z.infer<typeof deviationsSchema>;
export type LoanApplicationFormData = z.infer<typeof loanApplicationSchema>;

// ── Validation message formatting ─────────────────────────────────────
//
// `formatCurrency` is the only PHP-aware helper this file needs. It
// exists locally so the schema module stays free of any UI-specific
// imports (the validation messages must render even in non-browser
// contexts, e.g. server-side parsing of a persisted form state).
function formatCurrency(value: number): string {
    if (!Number.isFinite(value)) return "₱0.00";
    const rounded = Math.round(value * 100) / 100;
    // The legacy templates use a plain comma-thousands + 2dp format
    // (e.g. "3,500.00"). `Intl.NumberFormat("en-PH")` is locale-correct
    // but emits a non-breaking space that reads as "3 500.00" — the
    // template uses ASCII commas, so we reproduce that here.
    const [whole, fraction] = rounded.toFixed(2).split(".");
    const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `₱${withCommas}.${fraction}`;
}
