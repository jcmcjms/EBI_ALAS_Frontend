import { z } from "zod";
import { isRichTextEmpty, RICH_TEXT_MAX_CHARS, richTextToPlainText } from "@/src/shared/lib/rich-text";

/** Backend `loan_data.creation_type` byte codes. */
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
 * True when Section 4 (Outstanding Loans) should be hidden:
 * New Loan and Additional Loan types don't require re-listing obligations.
 * Defaults to showing Section 4 when code is null.
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
// `productWithDescription`: product description (e.g. "C35 - Quick Loan"),
// distinct from `status` (e.g. "Active"). Optional because Zod strips
// unknown keys at parse time.
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
// from the CIS feed). No upper-bound validation against outstanding
// balance — the AO may enter any positive amount.
export const ebiReloanSchema = z.object({
    pn: z.string().default(""),
    name: z.string().default(""),
    existingDeduction: z.number().default(0),
    outstandingBalance: z.number().default(0),
    payToClose: z
        .number()
        .min(0, "Pay to close must be a positive amount")
        .default(0),
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
// Bank-fee fields: smart defaults with editable override.
// - max() bounds are sanity checks (fat-finger prevention), not policy limits
// - standardFeesSnapshot captures policy at selection time for audit trail
export const loanParametersSchema = z.object({
    product: z.string(),
    purpose: z.string(),
    proposedAmount: z.number().default(0),
    term: z.number().default(0),
    policyTermMonths: z.number().optional(),
    interestRate: z.number().optional(),
    nthpDate: z.string().optional(),

    // ── Bank-fee fields (Smart Default + Editable Override) ─────
    notarialFee: z.number().default(0),
    docStamps: z.number().default(0),
    insurance: z.number().default(0),

    // ── Audit snapshot — what the bank policy expected ──────────
    standardFeesSnapshot: z
        .object({
            notarialFee: z.number().default(0),
            docStamps: z.number().default(0),
            insurance: z.number().default(0),
        })
        .default({ notarialFee: 0, docStamps: 0, insurance: 0 }),
});

// ── Verification Conducted ─────────────────────────────────────
// `findings` now carries a sanitized HTML subset (bold/italic/lists) from the
// rich-text editor, so "required" and length rules run against the *text
// content*: `<p></p>` is an empty document, not findings.
export const verificationSchema = z.object({
    findings: z
        .string()
        .refine((html) => !isRichTextEmpty(html), "Findings are required. Document what was verified.")
        .refine(
            (html) => richTextToPlainText(html).length <= RICH_TEXT_MAX_CHARS,
            `Findings must be ${RICH_TEXT_MAX_CHARS} characters or fewer.`
        ),
});

// ── Deviations / Remarks ───────────────────────────────────────
// - hasDeviations: toggle for deviation section
// - deviationDetails: selected reasons (required if true, via superRefine
//   to avoid stale errors when unticking)
// - deviationJustifications: per-reason text (≥5 chars per checked reason;
//   stale entries tolerated, pruned on uncheck)
// - otherRemarks: always required (even without deviations)
// - feeDeviationJustification: conditional (only when fee deviates from standard)
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
    "No latest payslip",
    "No interview sheet",
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

/**
 * Minimum length for a per-reason justification. Set to 5 to
 * reject lazy inputs ("ok", "n/a", "...") that would technically
 * satisfy a non-empty check but provide no real audit value.
 */
const MIN_JUSTIFICATION_LENGTH = 5;

export const deviationsSchema = z
    .object({
        hasDeviations: z.boolean().default(false),
        deviationDetails: z
            .array(z.enum(DEVIATION_REASONS))
            .default([]),
        /** Maps each checked deviation reason to its justification text. */
        deviationJustifications: z
            .record(z.string(), z.string().trim())
            .default({}),
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

        // ── Relational rule: every checked reason needs a justification
        //
        // Iterates the *checked* reasons and emits a Zod issue whose
        // `path` points at `deviationJustifications[<reason>]`. RHF's
        // `errors` object surfaces that path as a nested record — the
        // UI (deviations-section.tsx) reads
        // `errors.deviations.deviationJustifications?.[reason]?.message`
        // and renders the error directly under the offending textarea,
        // so the AO sees the gap at the field, not at the top of the
        // form.
        //
        // Reverse direction (a justification without a checked reason)
        // is NOT rejected here: stale entries are pruned by the UI's
        // `toggleReason` on uncheck, and the schema stays declarative.
        if (data.hasDeviations && data.deviationDetails.length > 0) {
            data.deviationDetails.forEach((reason) => {
                const justification = data.deviationJustifications?.[reason];
                const trimmed = justification?.trim() ?? "";
                if (trimmed.length < MIN_JUSTIFICATION_LENGTH) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["deviationJustifications", reason],
                        message: `Provide a justification (at least ${MIN_JUSTIFICATION_LENGTH} characters) for "${reason}".`,
                    });
                }
            });
        }
    });

// ── Selected Loan (per-loan state for multi-loan applications) ──
//
// Represents a single loan selected in step 1.3. Each selected loan
// carries its own parameters (amount, rate, term, fees) to support
// independent approval forms when multiple loans are processed together.
// The `productCode` field is extracted from the product description for
// the Zod-level unique-product constraint (see `loanApplicationSchema.superRefine`).
export const selectedLoanSchema = z.object({
    /**
     * Unique identifier for RHF field array. This is RHF's internal key
     * (`keyName` option) and lives only in the `fields` snapshot returned
     * by `useFieldArray` — it never lands in form values, so it must NOT
     * be required in the schema (otherwise every `zodResolver` submit would
     * fail with "loans.N.id: Required"). React keys in the UI layer use
     * `loanNo` (the actual PN), which is stable and meaningful.
     */
    // id: z.string()  <-- RHF internal only; not part of form values
    /** The loan number (PN) selected by the AO. */
    loanNo: z.string().min(1, "Loan number is required"),
    /**
     * Extracted product code (e.g., "C21", "C35") used for:
     * 1. UI-level constraint (prevent same-product selection)
     * 2. Zod-level validation (superRefine unique check)
     * 3. Smart-default fee lookup
     */
    productCode: z.string(),
    /** Full product description from the pending loan (e.g., "C21 - Salary Loan"). */
    productDescription: z.string(),
    /** Creation type code (0/1/2/6/null) from the pending loan. */
    creationTypeCode: creationTypeCodeSchema,
    /** Creation type label (e.g., "New Loan", "Restructured") from the pending loan. */
    creationTypeLabel: z.string(),
    /**
     * Branch code extracted from the selected accountId.
     * Used for loan-class lookup (cat_loan_class) in the approval form.
     */
    branchCode: z.string(),
    /** All loan parameters for this specific loan. */
    parameters: loanParametersSchema,
    /**
     * Frozen at submission: the TERM (Days) actually printed on the
     * approval form. Present only on review/approval pages that receive
     * data from the backend (not on the create page).
     */
    approvalTermDays: z.number().optional(),
    /**
     * Frozen at submission: annual rate in percent (e.g. 21.57),
     * normalized from webloan's decimal fraction. Present only on
     * review/approval pages that receive data from the backend.
     */
    annualRatePercent: z.number().optional(),
    /**
     * webloan loan_data.c_doc_stamp captured when the loan was selected.
     * Approval form Doc. Stamp = this value (0 when null) — never 0.75% of principal.
     */
    cDocStamp: z.number().optional(),

    // ── §5 obligations declared against this loan only ──────────
    ebiReloans: z.array(ebiReloanSchema).default([]),
    buyOuts: z.array(buyOutSchema).default([]),
    incomingLoans: z.array(incomingLoanSchema).default([]),

    // ── §6 per-loan verification trail ──────────────────────────
    verification: verificationSchema,

    // ── §7 per-loan deviations / remarks audit bucket ───────────
    deviations: deviationsSchema,
});

// ── Full Loan Application ──────────────────────────────────────
//
// `loanApplicationSchema` is the root schema wired to `useForm`'s
// resolver. It carries cross-field validation rules via `superRefine`:
//
// 1. Fee deviation: if any fee field in any loan deviates from the
//    `standardFeesSnapshot`, a `feeDeviationJustification` is required.
//
// 2. Unique products: cannot select multiple loans of the same product
//    code in a single application (enforced at both UI and schema level).
//
// 3. LoanType: "New" or "Renewal" — determines which tier of the
//    approval matrix the loan is routed to.
//
// (The legacy Excel's "Capacity to Pay" checks — monthly amortization
// vs. disposable income, and computed amortization vs. the tiered
// minimum table — were previously enforced here. The UI no longer
// surfaces a capacity-to-pay panel in the Loan Parameters section, and
// the .NET 8 backend re-runs both checks authoritatively on submit.)
export const loanApplicationSchema = z
    .object({
        branchType: branchTypeSchema,
        client: clientSchema,
        // Replaces single `loan: loanParametersSchema` with an array of
        // independently-processed loans. Each loan has its own parameters,
        // enabling multiple distinct approval forms within one application.
        loans: z.array(selectedLoanSchema).min(1, "Select at least one loan to process."),
        outstandingLoans: z.array(outstandingLoanSchema).default([]),
        preLoan: preLoanRefSchema.optional(),
        // ── Delegation-of-authority routing ──────────────────────────
        // "New" or "Renewal" — determines which tier of the approval
        // matrix the loan is routed to. Default derived from form data.
        loanType: z.enum(["New", "Renewal"]).default("New"),
    })
    .superRefine((data, ctx) => {
        const { loans } = data;

        // ── Rule 1: Fee deviation justification (per-loan) ─────────────
        //
        // Iterate all loans and check if any fee field deviates from its
        // snapshot. If so, a justification is required on THAT loan.
        const FEES_TOLERANCE = 0.01;

        for (let i = 0; i < loans.length; i++) {
            const loan = loans[i];
            const snapshot = loan.parameters.standardFeesSnapshot ?? {
                notarialFee: 0,
                docStamps: 0,
                insurance: 0,
            };

            const deviated =
                Math.abs((loan.parameters.notarialFee ?? 0) - (snapshot.notarialFee ?? 0)) > FEES_TOLERANCE ||
                Math.abs((loan.parameters.docStamps ?? 0) - (snapshot.docStamps ?? 0)) > FEES_TOLERANCE ||
                Math.abs((loan.parameters.insurance ?? 0) - (snapshot.insurance ?? 0)) > FEES_TOLERANCE;

            if (deviated && !loan.deviations?.feeDeviationJustification?.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["loans", i, "deviations", "feeDeviationJustification"],
                    message:
                        "Provide a justification — at least one fee on this loan deviates from the bank's standard rate.",
                });
            }
        }

        // ── Rule 2: Unique product codes across all selected loans ─────
        //
        // Security/Data Integrity: enforce unique products at the schema
        // level to complement the UI-level tooltip prevention. This ensures
        // backend validation matches frontend constraints.
        const productCodes = loans
            .map((l) => l.productCode)
            .filter((code) => code.length > 0);
        const uniqueCodes = new Set(productCodes);

        if (uniqueCodes.size !== productCodes.length) {
            // Find the duplicate codes for a more helpful error message
            const seen = new Set<string>();
            const duplicates = productCodes.filter((code) => {
                if (seen.has(code)) return true;
                seen.add(code);
                return false;
            });

            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Cannot select multiple loans of the same product (${duplicates[0]}).`,
                path: ["loans"],
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
/** A single loan selected in step 1.3, with its own parameters. */
export type SelectedLoan = z.infer<typeof selectedLoanSchema>;
export type VerificationData = z.infer<typeof verificationSchema>;
export type DeviationsData = z.infer<typeof deviationsSchema>;
export type LoanApplicationFormData = z.infer<typeof loanApplicationSchema>;

/** Fresh §5–§7 buckets for a newly selected loan (single writer: active-loans-table). */
export function createPerLoanSectionDefaults() {
    return {
        ebiReloans: [] as EbiReloan[],
        buyOuts: [] as BuyOut[],
        incomingLoans: [] as IncomingLoan[],
        verification: { findings: "" },
        deviations: {
            hasDeviations: false,
            deviationDetails: [] as DeviationReason[],
            deviationJustifications: {} as Record<string, string>,
            aoRecommendation: "",
            otherRemarks: "",
            feeDeviationJustification: "",
        },
    };
}
