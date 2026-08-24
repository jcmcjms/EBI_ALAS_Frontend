import { z } from "zod";

// ── Client / CIS Info ──────────────────────────────────────────
export const clientSchema = z.object({
    cisId: z.string().min(1, "CIS ID is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    agency: z.string().min(1, "Agency is required"),
    position: z.string().optional(),
    employeeId: z.string().optional(),
    netTakeHomePay: z.number().min(0, "NTHP must be positive").optional(),
});

// ── Outstanding Loan (existing obligation) ─────────────────────
export const outstandingLoanSchema = z.object({
    pn: z.string(),
    principalBalance: z.number().default(0),
    amortization: z.number().default(0),
    outstandingBalance: z.number().default(0),
    status: z.string().default("Active"),
    payToClose: z.boolean().default(false),
});

// ── Buy-Out (pay-off from another bank/coop) ──────────────────
export const buyOutSchema = z.object({
    institutionName: z.string().min(1, "Institution name is required"),
    loanBalance: z.number().min(0, "Balance must be positive"),
    monthlyAmortization: z.number().min(0, "Amortization must be positive"),
    payoffAmount: z.number().min(0, "Payoff amount must be positive").optional(),
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
    coMaker: z.string().optional(),
});

// ── Deviations / Remarks ───────────────────────────────────────
export const deviationsSchema = z.object({
    hasDeviations: z.boolean().default(false),
    deviationDetails: z.string().optional(),
    remarks: z.string().optional(),
    aoRecommendation: z.string().optional(),
});

// ── Full Loan Application ──────────────────────────────────────
export const loanApplicationSchema = z.object({
    client: clientSchema,
    loan: loanParametersSchema,
    outstandingLoans: z.array(outstandingLoanSchema).default([]),
    buyOuts: z.array(buyOutSchema).default([]),
    deviations: deviationsSchema.optional(),
});

// ── Inferred types ─────────────────────────────────────────────
export type ClientFormData = z.infer<typeof clientSchema>;
export type OutstandingLoan = z.infer<typeof outstandingLoanSchema>;
export type BuyOut = z.infer<typeof buyOutSchema>;
export type LoanParameters = z.infer<typeof loanParametersSchema>;
export type DeviationsData = z.infer<typeof deviationsSchema>;
export type LoanApplicationFormData = z.infer<typeof loanApplicationSchema>;
