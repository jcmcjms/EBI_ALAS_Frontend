import { z } from "zod";

// DRY helper for numeric fields: handles empty strings gracefully and applies min validation
const num = (min = 0) => z.coerce.number({ invalid_type_error: "Must be a valid number" }).min(min, `Min is ${min}`);
const int = (min = 0) => num(min).int("Must be a whole number");

export const loanProductSchema = z.object({
	// Basic Info
	productId: z.string().min(2, "Product ID must be at least 2 characters"),
	parentId: z.string().optional().nullable(),
	description: z.string().min(3, "Description is required"),
	notes: z.string().optional().nullable(),
	hierarchyLevel: int(),
	displayOrder: int(),
	mappedMis: z.string().optional().nullable(),
	mappedCls: z.string().optional().nullable(),
	mappedSec: z.string().optional().nullable(),
	status: z.enum(["Active", "Inactive", "Draft"]).default("Active"),

	// Ranges
	minLoanableAmount: num(),
	maxLoanableAmount: num(),
	minInterestRate: num(),
	maxInterestRate: num(),
	minServiceCharge: num(),
	maxServiceCharge: num(),
	minPenaltyFee: num(),
	maxPenaltyFee: num(),
	notarialFee: num(),
	collectionFee: num(),

	// Penalty Rates
	minLateAmortPenalty: num(),
	maxLateAmortPenalty: num(),
	minPdiPenalty: num(),
	maxPdiPenalty: num(),
	minPdpPenalty: num(),
	maxPdpPenalty: num(),

	// Term Settings
	minLoanTerm: int(),
	maxLoanTerm: int(),
	minPayInterval: int(),
	maxPayInterval: int(),
	minNoOfAmortizations: int(),
	maxNoOfAmortizations: int(),
	minDiscountDays: int(),
	maxDiscountDays: int(),
	minGracePeriod: int(),
	maxGracePeriod: int(),
}).refine((data) => data.minLoanableAmount <= data.maxLoanableAmount, {
	message: "Min cannot exceed Max",
	path: ["maxLoanableAmount"],
}).refine((data) => data.minInterestRate <= data.maxInterestRate, {
	message: "Min cannot exceed Max",
	path: ["maxInterestRate"],
}).refine((data) => data.minLoanTerm <= data.maxLoanTerm, {
	message: "Min cannot exceed Max",
	path: ["maxLoanTerm"],
});

export type LoanProduct = z.infer<typeof loanProductSchema> & { id?: string };
