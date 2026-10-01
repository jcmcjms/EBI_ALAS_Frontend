import { describe, it, expect } from "vitest";
import {
    computeLoanMetrics,
    resolveApprovalTermDays,
    toAnnualRatePercent,
    formatRatePercent,
    buildProductLine,
    DAYS_PER_MONTH,
    GRACE_TOLERANCE_DAYS,
    LEGACY_TOTAL_DEDUCTION_RATE,
    LEGACY_NOTARIAL_FEE,
} from "@/src/features/loans/utils/loan-approval-utils";
import { computeMonthlyAmortization } from "@/src/features/loans/utils/loan-computations";



describe("resolveApprovalTermDays", () => {
    it.each([
        [2572, 84, 2520],  
        [720, 1, 720],     
        [2520, 84, 2520],  
        [900, null, 900],  
    ])(
        "feedTermDays=%d, policyTermMonths=%s → %d",
        (feedTermDays, policyTermMonths, expected) => {
            expect(resolveApprovalTermDays(feedTermDays, policyTermMonths)).toBe(expected);
        }
    );

    it("returns feed when policyTermMonths is 0", () => {
        expect(resolveApprovalTermDays(1000, 0)).toBe(1000);
    });

    it("returns feed when policyTermMonths is negative", () => {
        expect(resolveApprovalTermDays(1000, -5)).toBe(1000);
    });

    it("returns policy when grace is exactly at boundary (120)", () => {
        
        expect(resolveApprovalTermDays(2640, 84)).toBe(2520);
    });

    it("returns feed when grace is just over boundary (121)", () => {
        
        expect(resolveApprovalTermDays(2641, 84)).toBe(2641);
    });

    it("returns policy when feed < policy but within grace tolerance", () => {
        
        expect(resolveApprovalTermDays(2400, 84)).toBe(2520);
    });

    it("returns feed when feed < policy and outside grace tolerance", () => {
        
        expect(resolveApprovalTermDays(2399, 84)).toBe(2399);
    });
});

describe("toAnnualRatePercent", () => {
    it.each([
        [0.2157, 21.57],   
        [21.57, 21.57],    
        [0, 0],            
    ])("rate=%d → %d", (rate, expected) => {
        expect(toAnnualRatePercent(rate)).toBe(expected);
    });

    it("returns 100 for rate = 1.0 (treated as fraction)", () => {
        expect(toAnnualRatePercent(1.0)).toBe(100);
    });

    it("returns verbatim for rate just above 1 (already in percent)", () => {
        expect(toAnnualRatePercent(1.0001)).toBe(1.0001);
    });

    it("returns 0 for negative rates", () => {
        expect(toAnnualRatePercent(-5)).toBe(0);
    });

    it("returns 0 for null/undefined", () => {
        expect(toAnnualRatePercent(null)).toBe(0);
        expect(toAnnualRatePercent(undefined)).toBe(0);
    });
});

describe("formatRatePercent", () => {
    it("trims float artefacts", () => {
        expect(formatRatePercent(9.660000000000001)).toBe("9.66");
    });

    it("preserves clean values", () => {
        expect(formatRatePercent(21.57)).toBe("21.57");
    });

    it("handles whole numbers", () => {
        expect(formatRatePercent(10)).toBe("10");
    });
});

describe("buildProductLine", () => {
    it("builds months-based line for policy-matching term", () => {
        const result = buildProductLine("A17", "ATM SAL", 2520, 84, 21.57);
        expect(result).toBe("[ A17 ] ATM SAL 84 months @ 21.57% per Annum");
    });

    it("builds days-based line for single-payment product", () => {
        const result = buildProductLine("C02", "C02 LUMPSUM", 720, 1, 9.66);
        expect(result).toBe("[ C02 ] C02 LUMPSUM 720 days @ 9.66% per Annum");
    });

    it("builds days-based line when policyTermMonths is null", () => {
        const result = buildProductLine("A17", "ATM SAL", 2572, null, 21.57);
        expect(result).toBe("[ A17 ] ATM SAL 2,572 days @ 21.57% per Annum");
    });

    it("builds days-based line when policyTermMonths is undefined", () => {
        const result = buildProductLine("A17", "ATM SAL", 2572, undefined, 21.57);
        expect(result).toBe("[ A17 ] ATM SAL 2,572 days @ 21.57% per Annum");
    });

    it("omits code prefix when productCode is null", () => {
        const result = buildProductLine(null, "ATM SAL", 2520, 84, 21.57);
        expect(result).toBe("ATM SAL 84 months @ 21.57% per Annum");
    });

    it("omits code prefix when productCode is empty string", () => {
        const result = buildProductLine("  ", "ATM SAL", 2520, 84, 21.57);
        expect(result).toBe("ATM SAL 84 months @ 21.57% per Annum");
    });
});

describe("constants", () => {
    it("DAYS_PER_MONTH is 30", () => {
        expect(DAYS_PER_MONTH).toBe(30);
    });

    it("GRACE_TOLERANCE_DAYS is 120", () => {
        expect(GRACE_TOLERANCE_DAYS).toBe(120);
    });
});

describe("computeLoanMetrics deduction convention", () => {
    const loan = {
        loanNo: "PN-1",
        productCode: "A16",
        productDescription: "APDS",
        creationTypeCode: 0,
        creationTypeLabel: "New Loan",
        branchCode: "B1",
        
        
        
        approvalTermDays: 2160,
        annualRatePercent: 9.66,
        parameters: {
            product: "APDS - RPSU",
            purpose: "Salary",
            proposedAmount: 322000,
            term: 1856,
            policyTermMonths: 60,
            interestRate: 7.5,
            notarialFee: 500,
            docStamps: 2415,
            insurance: 0,
            standardFeesSnapshot: { notarialFee: 500, docStamps: 2415, insurance: 0 },
        },
        ebiReloans: [],
        buyOuts: [],
        incomingLoans: [],
        verification: { findings: "" },
        deviations: {
            hasDeviations: false,
            deviationDetails: [],
            deviationJustifications: {},
            otherRemarks: "",
        },
    } as Parameters<typeof computeLoanMetrics>[0];

    const obligations = {
        outstandingLoans: [],
        ebiReloans: [],
        buyOuts: [],
        incomingLoans: [],
        client: {
            cisId: "CIS-1",
            firstName: "Juan",
            lastName: "Dela Cruz",
            agency: "DepEd",
            netTakeHomePay: 15000,
        },
    } as Parameters<typeof computeLoanMetrics>[1];

    it("fixes Total Deductions at 6% and plugs Application Charge", () => {
        const c = computeLoanMetrics(loan, obligations);
        const principal = 322000;
        expect(c.deductionsSubtotal).toBeCloseTo(principal * LEGACY_TOTAL_DEDUCTION_RATE, 2);
        expect(c.notarialFee).toBe(LEGACY_NOTARIAL_FEE);
        expect(c.applicationCharge).toBeCloseTo(
            c.deductionsSubtotal - c.docStamp - c.notarialFee,
            2,
        );
        expect(c.deductionPct).toBeCloseTo(6, 5);
        expect(c.grossProceeds).toBeCloseTo(principal - c.deductionsSubtotal, 2);
    });

    it("uses frozen cDocStamp as Doc. Stamp (no 0.75% generation)", () => {
        const c = computeLoanMetrics(
            { ...loan, cDocStamp: 3000 } as Parameters<typeof computeLoanMetrics>[0],
            obligations,
        );
        expect(c.docStamp).toBe(3000);
        expect(c.applicationCharge).toBeCloseTo(322000 * 0.06 - 3000 - 500, 2);
    });

    it("prints Doc. Stamp 0 when cDocStamp is missing or zero", () => {
        const missing = computeLoanMetrics(
            { ...loan, cDocStamp: undefined } as Parameters<typeof computeLoanMetrics>[0],
            obligations,
        );
        expect(missing.docStamp).toBe(0);
        expect(missing.applicationCharge).toBeCloseTo(322000 * 0.06 - 500, 2);

        const zero = computeLoanMetrics(
            { ...loan, cDocStamp: 0 } as Parameters<typeof computeLoanMetrics>[0],
            obligations,
        );
        expect(zero.docStamp).toBe(0);
    });

    it("prefers frozen approvalTermDays and annualRatePercent", () => {
        const c = computeLoanMetrics(loan, obligations);
        
        
        expect(c.approvalTermDays).toBe(2160);
        expect(c.annualRatePercent).toBe(9.66);
        
        expect(c.amortization).toBeCloseTo(
            computeMonthlyAmortization(322000, 9.66, 2160),
            2,
        );
    });

    it("re-derives term/rate when frozen fields are absent", () => {
        const legacy = {
            ...loan,
            approvalTermDays: undefined,
            annualRatePercent: undefined,
        } as Parameters<typeof computeLoanMetrics>[0];
        const c = computeLoanMetrics(legacy, obligations);
        expect(c.approvalTermDays).toBe(1800);
        expect(c.annualRatePercent).toBe(7.5);
    });
});
