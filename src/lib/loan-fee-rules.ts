/**
 * Loan fee computation — mirrors `Features/Loans/LoanFeeRules.cs` on the
 * .NET 8 backend.
 *
 * Why this lives on the frontend *and* the backend:
 *   - The frontend needs the expected ("standard") fee to populate the
 *     `CurrencyInput` smart-default and to detect overrides in real time.
 *   - The backend needs the same values to *re-validate* the value the
 *     AO submitted, and to decide whether a deviation is allowable or
 *     needs a justification.
 *
 * ## Backend contract
 *
 * The `LoanProduct` entity (ALAS-owned mirror of `webloan.loan_product`)
 * stores the three bank fees as **flat decimal columns** — `NotarialFee`,
 * `DocStampFee`, `InsuranceFee` — keyed by the product's natural key
 * (`code`). There is no per-fee rule table; the value the AO sees as
 * "standard" is the column value straight from the product row.
 *
 * (The earlier `fees[]` array shape — with `feeType: "FLAT" | "PERCENTAGE"`,
 * `defaultValue`, `rate`, and `maxAllowedDeviation` per fee — never
 * existed in the deployed backend. It was a frontend-only model that
 * assumed a richer contract than the C# service implements. This file
 * now mirrors what's actually there.)
 *
 * `MaxAllowedDeviation` is also no longer per-fee; the column isn't
 * present on `LoanProduct`. The wizard's deviation justification
 * therefore uses a single bank-wide tolerance from the loan config
 * (out of scope for this file) — the FE no longer needs to compute
 * per-fee deviation against a rule that doesn't exist server-side.
 *
 * Decimal arithmetic: PHP currency values are stored as `number` on the
 * frontend (JSON's only number type), so we use plain `Math.round` for
 * two-decimal precision. The backend uses `decimal` and `Math.Round` on
 * the C# side — both round-half-away-from-zero at 2dp.
 */
import type { LoanProductResponse } from "@/src/lib/api/types";

/** Round to 2 decimal places using half-away-from-zero (matches C# `Math.Round`). */
export function roundCurrency(value: number): number {
    if (!Number.isFinite(value)) return 0;
    // `Math.round` is half-toward-positive-infinity in JS; for currency,
    // banks expect half-away-from-zero. Implement that explicitly so a
    // 0.005 case rounds to 0.01 (not 0.00).
    return Math.sign(value) * Math.round(Math.abs(value) * 100) / 100;
}

/**
 * Per-fee helper, kept for callers that still want to look up a single
 * fee on a product. Returns the flat column value, rounded to 2dp.
 *
 * On the deployed backend the fee IS the column, so there's no
 * FLAT/PERCENTAGE branching anymore — but the helper keeps the
 * (`feeCode`, `principal`) signature so the wizard call sites
 * (`computeExpectedFees`) do not need to change.
 */
export function computeStandardFee(
    fee: { notarialFee: number } | { docStampFee: number } | { insuranceFee: number } | number,
    _principal: number
): number {
    // `fee` may be the raw column number (preferred), or a partial
    // product row in the old shape. Tolerate both so the wizard does
    // not break if a future caller still passes the legacy form.
    if (typeof fee === "number") return roundCurrency(fee);
    if ("notarialFee" in fee) return roundCurrency(fee.notarialFee);
    if ("docStampFee" in fee) return roundCurrency(fee.docStampFee);
    if ("insuranceFee" in fee) return roundCurrency(fee.insuranceFee);
    return 0;
}

/**
 * The full snapshot of "what the bank policy expected for this product
 * at this principal" — used both as the smart-default suggestion and
 * for the deviation audit (so compliance can report "AO overrode the
 * notarial fee on X% of loans last quarter").
 *
 * With the flat-column contract, the snapshot is just the three fee
 * columns from the product row. The `principal` parameter is preserved
 * (and ignored) so the wizard's call site does not need to change.
 */
export interface ExpectedFeesSnapshot {
    notarialFee: number;
    docStamps: number;
    insurance: number;
}

export function computeExpectedFees(
    product: LoanProductResponse | null | undefined,
    _principal: number
): ExpectedFeesSnapshot {
    if (!product) {
        return { notarialFee: 0, docStamps: 0, insurance: 0 };
    }
    return {
        notarialFee: roundCurrency(product.notarialFee),
        docStamps: roundCurrency(product.docStampFee),
        insurance: roundCurrency(product.insuranceFee),
    };
}
