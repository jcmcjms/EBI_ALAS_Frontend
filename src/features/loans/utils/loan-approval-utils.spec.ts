import { describe, expect, it } from "vitest";
import {
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
