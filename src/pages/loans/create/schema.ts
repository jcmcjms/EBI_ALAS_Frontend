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

// ── EBI Reloan ─────────────────────────────────────────────────
export const ebiReloanSchema = z.object({
    pn: z.string().default(""),
    name: z.string().default(""),
    existingDeduction: z.number().default(0),
    outstandingBalance: z.number().default(0),
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
    modeOfPayment: z.string().min(1, "Mode of payment is required"),
    dateOfFirstRelease: z.string().optional(),
    nthpDate: z.string().optional(),
    coMaker: z.string().optional(),
});

// ── Verification Conducted ─────────────────────────────────────
export const verificationSchema = z.object({
    conductedBy: z.string().optional(),
    verificationDate: z.string().optional(),
    findings: z.string().optional(),
});

// ── Deviations / Remarks ───────────────────────────────────────
export const deviationsSchema = z.object({
    hasDeviations: z.boolean().default(false),
    deviationDetails: z.string().optional(),
    remarks: z.string().optional(),
    aoRecommendation: z.string().optional(),
    otherRemarks: z.string().optional(),
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
    verification: verificationSchema.optional(),
    deviations: deviationsSchema.optional(),
});

// ── Inferred types ─────────────────────────────────────────────
export type BranchTypeData = z.infer<typeof branchTypeSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type OutstandingLoan = z.infer<typeof outstandingLoanSchema>;
export type EbiReloan = z.infer<typeof ebiReloanSchema>;
export type BuyOut = z.infer<typeof buyOutSchema>;
export type IncomingLoan = z.infer<typeof incomingLoanSchema>;
export type LoanParameters = z.infer<typeof loanParametersSchema>;
export type VerificationData = z.infer<typeof verificationSchema>;
export type DeviationsData = z.infer<typeof deviationsSchema>;
export type LoanApplicationFormData = z.infer<typeof loanApplicationSchema>;
