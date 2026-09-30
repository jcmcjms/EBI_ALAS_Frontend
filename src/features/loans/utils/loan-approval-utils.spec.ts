import { describe, expect, it } from "vitest";
import {
    buildPrintableDeviationEntries,
    FEE_OVERRIDE_REASON,
    isBlankBuyOut,
    isBlankIncomingLoan,
    isBlankReloan,
    printableObligationRows,
} from "./loan-approval-utils";

describe("isBlankReloan", () => {
    it("treats a row with no identifiers and no amounts as blank", () => {
        expect(
            isBlankReloan({ pn: "", name: "", existingDeduction: 0, outstandingBalance: 0, payToClose: 0 }),
        ).toBe(true);
    });

    it("keeps a row that carries an identifier", () => {
        expect(
            isBlankReloan({ pn: "P-1", name: "", existingDeduction: 0, outstandingBalance: 0, payToClose: 0 }),
        ).toBe(false);
    });

    it("keeps a row that carries an amount", () => {
        expect(
            isBlankReloan({ pn: "", name: "", existingDeduction: 250, outstandingBalance: 0, payToClose: 0 }),
        ).toBe(false);
    });
});

describe("isBlankBuyOut", () => {
    it("treats an all-default row as blank", () => {
        expect(isBlankBuyOut({ pn: "", name: "", amortization: 0, outstandingBalance: 0 })).toBe(true);
    });

    it("keeps a row with an outstanding balance", () => {
        expect(isBlankBuyOut({ pn: "", name: "", amortization: 0, outstandingBalance: 10_000 })).toBe(false);
    });
});

describe("isBlankIncomingLoan", () => {
    it("treats an all-default row as blank", () => {
        expect(isBlankIncomingLoan({ name: "", deductions: 0, remarks: "" })).toBe(true);
    });

    it("keeps a row with remarks only", () => {
        expect(isBlankIncomingLoan({ name: "", deductions: 0, remarks: "Undeducted per payroll" })).toBe(false);
    });
});

describe("printableObligationRows", () => {
    it("drops blank placeholders and keeps meaningful rows", () => {
        const blank = { pn: "", name: "", amortization: 0, outstandingBalance: 0 };
        const filled = { pn: "P-9", name: "Home Dev Fund", amortization: 1_200, outstandingBalance: 40_000 };
        expect(printableObligationRows([blank, filled], isBlankBuyOut)).toEqual([filled]);
    });

    it("tolerates an undefined list", () => {
        expect(printableObligationRows(undefined, isBlankBuyOut)).toEqual([]);
    });
});

describe("buildPrintableDeviationEntries", () => {
    it("returns an empty list when no deviations bucket exists", () => {
        expect(buildPrintableDeviationEntries(undefined)).toEqual([]);
    });

    it("pairs each declared reason with its trimmed remark, in declaration order", () => {
        const entries = buildPrintableDeviationEntries({
            hasDeviations: true,
            deviationDetails: [
                "Age not within the prescribed parameters",
                "Lacking CIBI",
            ],
            deviationJustifications: {
                "Age not within the prescribed parameters": "  Borrower is 66 with strong co-maker.  ",
                "Lacking CIBI": "CIBI requested, pending release.",
            },
        });

        expect(entries).toEqual([
            {
                reason: "Age not within the prescribed parameters",
                remark: "Borrower is 66 with strong co-maker.",
                isFeeOverride: false,
            },
            { reason: "Lacking CIBI", remark: "CIBI requested, pending release.", isFeeOverride: false },
        ]);
    });

    it("leaves the remark empty when none was captured (legacy snapshot)", () => {
        const [entry] = buildPrintableDeviationEntries({
            hasDeviations: true,
            deviationDetails: ["Lacking CIBI"],
        });
        expect(entry.remark).toBe("");
    });

    it("appends the fee-override deviation last with its justification", () => {
        const entries = buildPrintableDeviationEntries({
            hasDeviations: true,
            deviationDetails: ["Lacking CIBI"],
            deviationJustifications: { "Lacking CIBI": "Pending release." },
            feeDeviationJustification: "Notary charged ₱750 (4-page docs).",
        });

        expect(entries).toHaveLength(2);
        expect(entries[1]).toEqual({
            reason: FEE_OVERRIDE_REASON,
            remark: "Notary charged ₱750 (4-page docs).",
            isFeeOverride: true,
        });
    });

    it("prints the fee-override deviation even when the deviations flag is off", () => {
        // Mirrors the backend: rows derive from declared data, not the flag.
        const entries = buildPrintableDeviationEntries({
            hasDeviations: false,
            deviationDetails: [],
            feeDeviationJustification: "Doc stamps adjusted per BIR ruling.",
        });

        expect(entries).toHaveLength(1);
        expect(entries[0].isFeeOverride).toBe(true);
    });

    it("drops duplicate reasons from legacy snapshots", () => {
        const entries = buildPrintableDeviationEntries({
            hasDeviations: true,
            deviationDetails: ["Lacking CIBI", "Lacking CIBI"],
            deviationJustifications: { "Lacking CIBI": "Pending release." },
        });

        expect(entries).toHaveLength(1);
    });
});
