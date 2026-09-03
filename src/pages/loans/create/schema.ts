import { z } from "zod";

// ── Branch & Type ──────────────────────────────────────────────
export const branchTypeSchema = z.object({
    loanType: z.string().min(1, "Loan type is required"),
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
export const outstandingLoanSchema = z.object({
    pn: z.string(),
    principalBalance: z.number().default(0),
    amortization: z.number().default(0),
    outstandingBalance: z.number().default(0),
    dateGranted: z.string().optional(),
    dateMaturity: z.string().optional(),
    status: z.string().default("Active"),
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
export const loanParametersSchema = z.object({
    product: z.string().min(1, "Loan product is required"),
    purpose: z.string().min(1, "Loan purpose is required"),
    proposedAmount: z
        .number()
        .min(1, "Proposed amount is required")
        .max(5_000_000, "Amount exceeds maximum allowed"),
    term: z.number().min(1, "Term must be at least 1 month").max(360),
    interestRate: z.number().min(0).max(100).optional(),
    nthpDate: z.string().optional(),
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
export const loanApplicationSchema = z.object({
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
});

// ── Inferred types ─────────────────────────────────────────────
export type BranchTypeData = z.infer<typeof branchTypeSchema>;
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
