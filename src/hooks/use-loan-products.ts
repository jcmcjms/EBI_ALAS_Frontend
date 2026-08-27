import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LoanProduct } from "../pages/admin/loan-products/types";

const LOAN_PRODUCTS_KEY = "loan-products";

// Mock data for demonstration. Replace with actual API calls.
const MOCK_PRODUCTS: LoanProduct[] = [
	{
		productId: "SAL-ADV-1M",
		description: "Salary Advance (1 Month)",
		notes: "Standard employees only",
		hierarchyLevel: 1,
		displayOrder: 10,
		mappedMis: "GL-101",
		mappedCls: "CLS-01",
		mappedSec: "SEC-01",
		minLoanableAmount: 5000,
		maxLoanableAmount: 50000,
		minInterestRate: 1.5,
		maxInterestRate: 2.5,
		minServiceCharge: 100,
		maxServiceCharge: 500,
		minPenaltyFee: 50,
		maxPenaltyFee: 200,
		notarialFee: 150,
		collectionFee: 50,
		minLateAmortPenalty: 1,
		maxLateAmortPenalty: 5,
		minPdiPenalty: 0.5,
		maxPdiPenalty: 2,
		minPdpPenalty: 0.5,
		maxPdpPenalty: 2,
		minLoanTerm: 1,
		maxLoanTerm: 1,
		minPayInterval: 15,
		maxPayInterval: 30,
		minNoOfAmortizations: 1,
		maxNoOfAmortizations: 2,
		minDiscountDays: 0,
		maxDiscountDays: 5,
		minGracePeriod: 0,
		maxGracePeriod: 3,
		status: "Active",
	},
	{
		productId: "PER-LOAN-6M",
		description: "Personal Loan (6 Months)",
		notes: "Open to all permanent employees with at least 1 year tenure",
		hierarchyLevel: 1,
		displayOrder: 20,
		mappedMis: "GL-201",
		mappedCls: "CLS-02",
		mappedSec: "SEC-02",
		minLoanableAmount: 10000,
		maxLoanableAmount: 150000,
		minInterestRate: 2.0,
		maxInterestRate: 3.5,
		minServiceCharge: 200,
		maxServiceCharge: 1000,
		minPenaltyFee: 100,
		maxPenaltyFee: 500,
		notarialFee: 300,
		collectionFee: 100,
		minLateAmortPenalty: 2,
		maxLateAmortPenalty: 8,
		minPdiPenalty: 1,
		maxPdiPenalty: 3,
		minPdpPenalty: 1,
		maxPdpPenalty: 3,
		minLoanTerm: 3,
		maxLoanTerm: 12,
		minPayInterval: 15,
		maxPayInterval: 30,
		minNoOfAmortizations: 3,
		maxNoOfAmortizations: 12,
		minDiscountDays: 0,
		maxDiscountDays: 10,
		minGracePeriod: 0,
		maxGracePeriod: 5,
		status: "Active",
	},
	{
		productId: "CAL-LOAN-3M",
		description: "Calamity Loan (3 Months)",
		notes: "For employees affected by natural disasters. Requires certification from HR.",
		hierarchyLevel: 2,
		displayOrder: 30,
		mappedMis: "GL-301",
		mappedCls: "CLS-03",
		mappedSec: "SEC-03",
		minLoanableAmount: 5000,
		maxLoanableAmount: 50000,
		minInterestRate: 0,
		maxInterestRate: 1,
		minServiceCharge: 0,
		maxServiceCharge: 0,
		minPenaltyFee: 0,
		maxPenaltyFee: 0,
		notarialFee: 0,
		collectionFee: 0,
		minLateAmortPenalty: 0,
		maxLateAmortPenalty: 0,
		minPdiPenalty: 0,
		maxPdiPenalty: 0,
		minPdpPenalty: 0,
		maxPdpPenalty: 0,
		minLoanTerm: 1,
		maxLoanTerm: 3,
		minPayInterval: 15,
		maxPayInterval: 30,
		minNoOfAmortizations: 1,
		maxNoOfAmortizations: 3,
		minDiscountDays: 0,
		maxDiscountDays: 0,
		minGracePeriod: 0,
		maxGracePeriod: 0,
		status: "Draft",
	},
];

function useInvalidateLoanProducts() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: [LOAN_PRODUCTS_KEY] });
}

export function useLoanProducts() {
	return useQuery({
		queryKey: [LOAN_PRODUCTS_KEY],
		queryFn: async () => {
			await new Promise((r) => setTimeout(r, 600)); // Simulate network
			return MOCK_PRODUCTS;
		},
		placeholderData: (prev) => prev,
		staleTime: 1000 * 60 * 5,
	});
}

export function useSaveLoanProduct() {
	const invalidate = useInvalidateLoanProducts();
	return useMutation({
		mutationFn: async (product: LoanProduct) => {
			// Simulate API call
			await new Promise((r) => setTimeout(r, 800));
			return product;
		},
		onSuccess: () => {
			invalidate();
			toast.success("Product configuration saved successfully.");
		},
		onError: () => toast.error("Failed to save product. Check audit logs."),
	});
}
