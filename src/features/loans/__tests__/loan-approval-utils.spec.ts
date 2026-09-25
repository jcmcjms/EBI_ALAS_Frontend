import { describe, it, expect } from "vitest";
import {
    resolveApprovalTermDays,
    toAnnualRatePercent,
    formatRatePercent,
    buildProductLine,
    DAYS_PER_MONTH,
    GRACE_TOLERANCE_DAYS,
} from "@/src/features/loans/utils/loan-approval-utils";

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
