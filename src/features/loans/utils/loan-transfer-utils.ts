/**
 * Maps loan rows between sections (Outstanding ↔ EBI ↔ BuyOut ↔ Incoming).
 *
 * Key rules:
 * - Product description becomes the row name (not status)
 * - Amortization maps to existingDeduction
 * - Preserves data for round-trip transfers
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
    /**
     * Product description (e.g. "C35 - Quick Loan") — distinct from
     * `status` (e.g. "C35 - Active"). Used as EBI reloan `name` on
     * transfer. Falls back to `status` if empty.
     */
    productWithDescription: string;
};

export type EbiReloanFormRow = {
    pn: string;
    name: string;
    existingDeduction: number;
    outstandingBalance: number;
    // AO-entered settlement amount. Seeded with 0 so payToClose <=
    // outstandingBalance validation passes on first render.
    // because `undefined > 0` is `false`, masking the schema's
    // intended UX signal for the AO's first keystroke.
    payToClose: number;
    // ── Round-trip ghost fields ──────────────────────────────────────
    // The EBI schema has no `dateGranted` / `dateMaturity` / `status`
    // columns, so mapping an Outstanding row *into* EBI would otherwise
    // lose those fields forever — and the reverse map (EBI →
    // Outstanding) would have nothing to restore them from. To make
    // the Outstanding ↔ EBI round trip lossless, we carry the relevant
    // source-row values on the EBI row as ghost fields. They are:
    //
    //   • NOT registered to any input (the AO never sees or edits them)
    //   • NOT part of `ebiReloanSchema`, so Zod's `zodResolver` strips
    //     them at submit time without rejecting the row
    //   • restored verbatim on the reverse transfer by `mapToOutstanding`
    //
    // `sourceStatus` specifically: the EBI row's `name` column is the
    // loan product's *description* (e.g. "C35 - Quick Loan"), not its
    // current *status* label (e.g. "C35 - Active"). The Outstanding
    // row needs the original status back when the AO moves the row
    // back to Outstanding — without this ghost, the round trip would
    // overwrite the Outstanding row's `status` with the EBI row's
    // `name` (the product description), corrupting the Status column
    // in Section 4.
    //
    // Keeping these on the row object (rather than in a separate
    // `Map<rowId, ...>`) makes the round trip survive re-renders,
    // schema resets, and the `useFieldArray` snapshot churn that
    // previously bit us.
    dateGranted?: string;
    dateMaturity?: string;
    sourceStatus?: string;
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
 * Loose shape for a row passed *into* a `mapTo*` function. The row's
 * actual schema depends on its source section (Outstanding / EBI /
 * Buy-Out / Incoming), and each schema has a different shape. We use
 * a record-with-unknown-values here so the mapping functions stay
 * agnostic about which schema produced the row — they just read
 * optional fields and apply their own defaults.
 *
 * Each field is explicitly `unknown` so callers can pass anything;
 * `safeString` / `safeNumber` in this file are the only legal way to
 * read from one.
 */
export type TransferSourceRow = {
    [key: string]: unknown;
    pn?: unknown;
    name?: unknown;
    status?: unknown;
    productWithDescription?: unknown;
    sourceStatus?: unknown;
    dateGranted?: unknown;
    dateMaturity?: unknown;
    amortization?: unknown;
    existingDeduction?: unknown;
    deductions?: unknown;
    outstandingBalance?: unknown;
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

export function mapToOutstanding(row: TransferSourceRow, source: LoanSection): OutstandingFormRow {
    const defaults: OutstandingFormRow = {
        pn: "",
        principalBalance: 0,
        amortization: 0,
        outstandingBalance: 0,
        dateGranted: "",
        dateMaturity: "",
        status: "",
        productWithDescription: "",
    };

    if (source === "ebi") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            // The EBI row's `name` is the product *description*
            // (e.g. "C35 - Quick Loan"), not the loan's *status*
            // label (e.g. "C35 - Active"). Restoring `status` from
            // `row.name` would corrupt the Status column in Section 4
            // after the round trip — the AO would see the product
            // description in the Status cell. Instead, we read the
            // original `status` from the ghost field stashed by
            // `mapToEbi` (see `EbiReloanFormRow.sourceStatus`).
            //
            // Fallback order:
            //   1. `row.sourceStatus` — the original backend status,
            //      preserved on the EBI row at transfer time.
            //   2. `row.name` — defensive: only kicks in for EBI rows
            //      that predate the `sourceStatus` ghost field (e.g.
            //      rows added manually before this change), where
            //      `name` would have been set to `status` instead of
            //      `productWithDescription` by the previous `mapToEbi`
            //      implementation. We accept the slight imperfection
            //      here rather than rendering an empty Status cell.
            //   3. `""` — empty default; `safeString(undefined) === ""`.
            status:
                safeString(row?.sourceStatus) ||
                safeString(row?.name),
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
    return { ...defaults, ...(row as Partial<OutstandingFormRow>) };
}

// ── EBI Reloans ──────────────────────────────────────────────────────────

export function mapToEbi(row: TransferSourceRow, source: LoanSection): EbiReloanFormRow {
    const defaults: EbiReloanFormRow = {
        pn: "",
        name: "",
        existingDeduction: 0,
        outstandingBalance: 0,
        payToClose: 0,
    };

    if (source === "outstanding") {
        // Use product description (not status) as EBI name.
        // Falls back to status for orphaned/retired product codes.
        const productDesc = safeString(row?.productWithDescription);
        const fallbackStatus = safeString(row?.status);

        return {
            ...defaults,
            pn: safeString(row?.pn),
            name: productDesc || fallbackStatus,
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
            // ── Stash source status for round-trip restore ────────────
            // The EBI row's `name` is the product *description*, NOT
            // the loan's *status* — so the reverse map (EBI → Outstanding)
            // can't derive the Outstanding row's `status` from `name`
            // without corrupting the Status column in Section 4.
            // Stash the source `status` here so `mapToOutstanding`
            // can restore it verbatim when the AO moves the row back.
            sourceStatus: safeString(row?.status),
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

    return { ...defaults, ...(row as Partial<EbiReloanFormRow>) };
}

// ── Buy-Outs ─────────────────────────────────────────────────────────────

export function mapToBuyOut(row: TransferSourceRow, source: LoanSection): BuyOutFormRow {
    const defaults: BuyOutFormRow = {
        pn: "",
        name: "",
        amortization: 0,
        outstandingBalance: 0,
    };

    if (source === "outstanding") {
        // Same product-description preference as `mapToEbi`: the
        // buyout row's `name` is a description of the loan product
        // (e.g. "C35 - Quick Loan"), not its current status label
        // (e.g. "C35 - Active"). Fall back to `status` when no
        // product description resolved on the backend.
        const productDesc = safeString(row?.productWithDescription);
        const fallbackStatus = safeString(row?.status);
        return {
            ...defaults,
            pn: safeString(row?.pn),
            name: productDesc || fallbackStatus,
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

    return { ...defaults, ...(row as Partial<BuyOutFormRow>) };
}

// ── Incoming / Undeducted ────────────────────────────────────────────────

export function mapToIncoming(row: TransferSourceRow, source: LoanSection): IncomingFormRow {
    const defaults: IncomingFormRow = {
        name: "",
        deductions: 0,
        remarks: "",
    };

    if (source === "outstanding") {
        // Same product-description preference as `mapToEbi` /
        // `mapToBuyOut`: the incoming row's `name` is a description
        // of the loan product (e.g. "C35 - Quick Loan"), not its
        // current status label (e.g. "C35 - Active"). Fall back to
        // `status` when no product description resolved on the
        // backend.
        const productDesc = safeString(row?.productWithDescription);
        const fallbackStatus = safeString(row?.status);
        return {
            ...defaults,
            name: productDesc || fallbackStatus,
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

    return { ...defaults, ...(row as Partial<IncomingFormRow>) };
}
