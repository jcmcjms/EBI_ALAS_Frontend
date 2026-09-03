/**
 * Loan Transfer Utilities
 * ------------------------
 * Pure mapping functions used by `useLoanTransfers` to "translate" a row's
 * schema when it is moved between the four loan sections in the loan
 * creation wizard:
 *
 *   - outstanding  (Outstanding Loans)
 *   - ebi          (EBI Reloans)
 *   - buyout       (Buy-Outs from other FIs)
 *   - incoming     (Incoming / Undeducted)
 *
 * The mapping rules deliberately mirror the way a loan officer would
 * classify the same obligation on paper: when a row is moved from
 * "Outstanding" to "EBI Reloans", the previous `status` (e.g. a product
 * description) becomes the `name`, and `amortization` becomes
 * `existingDeduction`. The intent is to lose the minimum amount of
 * information possible while producing a valid record for the target
 * section.
 *
 * These functions are intentionally pure and side-effect free so they
 * can be unit-tested without a React tree.
 */

export type LoanSection = "outstanding" | "ebi" | "buyout" | "incoming";

export type OutstandingFormRow = {
    pn: string;
    principalBalance: number;
    amortization: number;
    outstandingBalance: number;
    dateGranted: string;
    dateMaturity: string;
    status: string;
};

export type EbiReloanFormRow = {
    pn: string;
    name: string;
    existingDeduction: number;
    outstandingBalance: number;
    // `payToClose` is the amount the AO intends to settle on this EBI
    // loan. It is hand-keyed in the table cell (not auto-populated by
    // a transfer), but the `ebiReloanSchema.superRefine` rule compares
    // it against `outstandingBalance`. We seed it with `0` in the
    // mapped defaults so the value is never `undefined` between the
    // append and the input mounting; otherwise the first render of
    // the row would briefly fail `payToClose <= outstandingBalance`
    // because `undefined > 0` is `false`, masking the schema's
    // intended UX signal for the AO's first keystroke.
    payToClose: number;
    // ── Round-trip ghost fields ──────────────────────────────────────
    // The EBI schema has no `dateGranted` / `dateMaturity` columns, so
    // mapping an Outstanding row *into* EBI would otherwise lose its
    // dates forever — and the reverse map (EBI → Outstanding) would
    // have nothing to restore them from. To make the Outstanding ↔ EBI
    // round trip lossless for dates, we carry the two dates on the
    // EBI row as ghost fields. They are:
    //
    //   • NOT registered to any input (the AO never sees or edits them)
    //   • NOT part of `ebiReloanSchema`, so Zod's `zodResolver` strips
    //     them at submit time without rejecting the row
    //   • restored verbatim on the reverse transfer by `mapToOutstanding`
    //
    // Keeping them on the row object (rather than in a separate
    // `Map<rowId, {dateGranted, dateMaturity}>`) makes the round trip
    // survive re-renders, schema resets, and the `useFieldArray`
    // snapshot churn that previously bit us.
    dateGranted?: string;
    dateMaturity?: string;
};

export type BuyOutFormRow = {
    pn: string;
    name: string;
    amortization: number;
    outstandingBalance: number;
};

export type IncomingFormRow = {
    name: string;
    deductions: number;
    remarks: string;
};

export const LOAN_SECTION_LABELS: Record<LoanSection, string> = {
    outstanding: "Outstanding Loans",
    ebi: "EBI Reloans",
    buyout: "Buy-Outs (Other FIs)",
    incoming: "Incoming / Undeducted",
};

/**
 * Coerce a possibly-undefined / possibly-string numeric value to a finite
 * number. Used so a transferred row never injects `NaN` into the form
 * state (which would later break the totals calculation).
 */
function safeNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    return 0;
}

function safeString(value: unknown, fallback = ""): string {
    if (typeof value === "string") return value;
    if (value == null) return fallback;
    return String(value);
}

// ── Outstanding ──────────────────────────────────────────────────────────

export function mapToOutstanding(row: any, source: LoanSection): OutstandingFormRow {
    const defaults: OutstandingFormRow = {
        pn: "",
        principalBalance: 0,
        amortization: 0,
        outstandingBalance: 0,
        dateGranted: "",
        dateMaturity: "",
        status: "",
    };

    if (source === "ebi") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            status: safeString(row?.name),
            amortization: safeNumber(row?.existingDeduction),
            outstandingBalance: safeNumber(row?.outstandingBalance),
            principalBalance: safeNumber(row?.outstandingBalance),
            // ── Restore dates stashed by `mapToEbi` ─────────────────────
            // The EBI row carries the original dates as ghost fields
            // (see `EbiReloanFormRow.dateGranted` / `.dateMaturity`).
            // We pull them back here so the Outstanding cell renders
            // the original dates after an EBI ↔ Outstanding round
            // trip. `defaults.dateGranted` / `dateMaturity` are `""`,
            // and `safeString(undefined) === ""`, so a row that *wasn't*
            // transferred through EBI (or that predates this change)
            // falls through to the empty defaults — no regression for
            // rows that never had dates in the first place.
            dateGranted: safeString(row?.dateGranted),
            dateMaturity: safeString(row?.dateMaturity),
        };
    }

    if (source === "buyout") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            status: safeString(row?.name),
            amortization: safeNumber(row?.amortization),
            outstandingBalance: safeNumber(row?.outstandingBalance),
            principalBalance: safeNumber(row?.outstandingBalance),
        };
    }

    if (source === "incoming") {
        return {
            ...defaults,
            status: safeString(row?.name),
            amortization: safeNumber(row?.deductions),
            outstandingBalance: safeNumber(row?.deductions),
            principalBalance: safeNumber(row?.deductions),
        };
    }

    // No-op transfer (source === "outstanding") — preserve the row.
    return { ...defaults, ...row };
}

// ── EBI Reloans ──────────────────────────────────────────────────────────

export function mapToEbi(row: any, source: LoanSection): EbiReloanFormRow {
    const defaults: EbiReloanFormRow = {
        pn: "",
        name: "",
        existingDeduction: 0,
        outstandingBalance: 0,
        payToClose: 0,
    };

    if (source === "outstanding") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            name: safeString(row?.status),
            existingDeduction: safeNumber(row?.amortization),
            outstandingBalance: safeNumber(row?.outstandingBalance),
            // ── Stash dates for round-trip restore ──────────────────────
            // The EBI cell has no date columns, so the dates would be
            // lost on the reverse transfer otherwise. We carry them as
            // ghost fields on the EBI row object — see the type doc
            // on `EbiReloanFormRow.dateGranted` / `.dateMaturity` for
            // the strip-on-submit contract. `safeString` is used
            // (rather than a direct property read) so an already-empty
            // / undefined source date round-trips as `""`, not as a
            // missing key, which keeps `mapToOutstanding` simple on
            // the reverse path.
            dateGranted: safeString(row?.dateGranted),
            dateMaturity: safeString(row?.dateMaturity),
        };
    }

    if (source === "buyout") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            name: safeString(row?.name),
            existingDeduction: safeNumber(row?.amortization),
            outstandingBalance: safeNumber(row?.outstandingBalance),
        };
    }

    if (source === "incoming") {
        return {
            ...defaults,
            name: safeString(row?.name),
            existingDeduction: safeNumber(row?.deductions),
            // An "incoming" row has no outstanding balance, so we keep the
            // expected deduction as the only monetary signal.
            outstandingBalance: 0,
        };
    }

    return { ...defaults, ...row };
}

// ── Buy-Outs ─────────────────────────────────────────────────────────────

export function mapToBuyOut(row: any, source: LoanSection): BuyOutFormRow {
    const defaults: BuyOutFormRow = {
        pn: "",
        name: "",
        amortization: 0,
        outstandingBalance: 0,
    };

    if (source === "outstanding") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            name: safeString(row?.status),
            amortization: safeNumber(row?.amortization),
            outstandingBalance: safeNumber(row?.outstandingBalance),
        };
    }

    if (source === "ebi") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            name: safeString(row?.name),
            amortization: safeNumber(row?.existingDeduction),
            outstandingBalance: safeNumber(row?.outstandingBalance),
        };
    }

    if (source === "incoming") {
        return {
            ...defaults,
            name: safeString(row?.name),
            amortization: safeNumber(row?.deductions),
            outstandingBalance: 0,
        };
    }

    return { ...defaults, ...row };
}

// ── Incoming / Undeducted ────────────────────────────────────────────────

export function mapToIncoming(row: any, source: LoanSection): IncomingFormRow {
    const defaults: IncomingFormRow = {
        name: "",
        deductions: 0,
        remarks: "",
    };

    if (source === "outstanding") {
        return {
            ...defaults,
            name: safeString(row?.status),
            deductions: safeNumber(row?.amortization),
            remarks: safeString(row?.pn),
        };
    }

    if (source === "ebi") {
        return {
            ...defaults,
            name: safeString(row?.name),
            deductions: safeNumber(row?.existingDeduction),
            remarks: safeString(row?.pn),
        };
    }

    if (source === "buyout") {
        return {
            ...defaults,
            name: safeString(row?.name),
            deductions: safeNumber(row?.amortization),
            remarks: safeString(row?.pn),
        };
    }

    return { ...defaults, ...row };
}