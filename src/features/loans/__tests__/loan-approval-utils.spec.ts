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

/**
 * Shared case table for approval-form convention rules. These tests are
 * the Vitest mirror of the xUnit cases in ApprovalFormConventionsTests.cs.
 * Do not "fix" one side without the other — the two implementations must
 * produce identical results for every row in this table.
 */

describe("resolveApprovalTermDays", () => {
    it.each([
        [2572, 84, 2520],  // Bug case: grace 52d ≤ 120 → policy wins
        [720, 1, 720],     // C02 single-payment: 30d vs 720d → feed verbatim
        [2520, 84, 2520],  // Idempotent
        [900, null, 900],  // No policy → feed
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
        // 84 * 30 = 2520, feed = 2640, grace = 120 (exactly at boundary)
        expect(resolveApprovalTermDays(2640, 84)).toBe(2520);
    });

    it("returns feed when grace is just over boundary (121)", () => {
        // 84 * 30 = 2520, feed = 2641, grace = 121 (just over boundary)
        expect(resolveApprovalTermDays(2641, 84)).toBe(2641);
    });

    it("returns policy when feed < policy but within grace tolerance", () => {
        // 84 * 30 = 2520, feed = 2400, |grace| = 120 (within tolerance)
        expect(resolveApprovalTermDays(2400, 84)).toBe(2520);
    });

    it("returns feed when feed < policy and outside grace tolerance", () => {
        // 84 * 30 = 2520, feed = 2399, |grace| = 121 (outside tolerance)
        expect(resolveApprovalTermDays(2399, 84)).toBe(2399);
    });
});

describe("toAnnualRatePercent", () => {
    it.each([
        [0.2157, 21.57],   // Fraction → percent
        [21.57, 21.57],    // Already in percent (idempotent)
        [0, 0],            // Zero
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
        // Frozen values DIVERGE from the re-derived ones
        // (resolveApprovalTermDays(1856, 60) === 1800; toAnnualRatePercent(7.5) === 7.5)
        // so an always-re-derive implementation cannot pass the preference test.
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
        // Frozen values (2160 / 9.66) diverge from the re-derived ones
        // (1800 / 7.5) — this test fails if frozen fields are ignored.
        expect(c.approvalTermDays).toBe(2160);
        expect(c.annualRatePercent).toBe(9.66);
        // PMT is locked to the frozen/resolved term and rate.
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
