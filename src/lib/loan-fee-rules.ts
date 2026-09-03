/**
 * Loan fee computation — *exactly* mirrors `Features/Loans/LoanFeeRules.cs`
 * on the .NET 8 backend.
 *
 * Why this lives on the frontend *and* the backend:
 *   - The frontend needs the expected ("standard") fee to populate the
 *     `CurrencyInput` smart-default and to detect overrides in real time.
 *   - The backend needs the same calculation to *re-validate* the value
 *     the AO submitted, and to decide whether a deviation is allowable
 *     or needs a justification.
 *
 * Both implementations read from the same `LoanProductResponse.fees[]`
 * table; both apply the same formula. If they ever drift, the backend
 * wins — see `isFeeOverrideAllowed` and the audit comment in the form.
 *
 * Decimal arithmetic: PHP currency values are stored as `number` on the
 * frontend (JSON's only number type), so we use plain `Math.round` for
 * two-decimal precision. The backend uses `decimal` and `Math.Round` on
 * the C# side — both round-half-away-from-zero at 2dp.
 */
import type { FeeType, LoanProductFeeRule, LoanProductResponse } from "@/src/lib/api/types";

/** Round to 2 decimal places using half-away-from-zero (matches C# `Math.Round`). */
export function roundCurrency(value: number): number {
    if (!Number.isFinite(value)) return 0;
    // `Math.round` is half-toward-positive-infinity in JS; for currency,
    // banks expect half-away-from-zero. Implement that explicitly so a
    // 0.005 case rounds to 0.01 (not 0.00).
    return Math.sign(value) * Math.round(Math.abs(value) * 100) / 100;
}

/**
 * Compute the standard fee for a single rule.
 *
 *   FLAT       → rule.defaultValue
 *   PERCENTAGE → principal * (rule.rate / 100)
 *
 * The result is rounded to 2dp before being returned so the value the
 * AO sees matches what the bank policy table says.
 */
export function computeStandardFee(
    rule: LoanProductFeeRule,
    principal: number
): number {
    const raw =
        rule.feeType === ("PERCENTAGE" satisfies FeeType)
            ? principal * (rule.rate / 100)
            : rule.defaultValue;
    return roundCurrency(raw);
}

/** Look up the rule for a given fee code on a product. */
export function findFeeRule(
    product: LoanProductResponse | null | undefined,
    code: LoanProductFeeRule["feeCode"]
): LoanProductFeeRule | undefined {
    return product?.fees.find((f) => f.feeCode === code);
}

/**
 * True when `actual` differs from `expected` by more than the rule's
 * `maxAllowedDeviation` (in absolute pesos). This is the "is the AO
 * deviating beyond the bank's tolerance?" check.
 *
 * The backend runs the same comparison on submit. If this returns
 * `true`, the form's `deviationJustification` becomes required.
 */
export function isFeeOverThreshold(
    rule: LoanProductFeeRule | undefined,
    actual: number | undefined,
    expected: number | undefined
): boolean {
    if (!rule) return false;
    if (actual === undefined || expected === undefined) return false;
    return Math.abs(actual - expected) > rule.maxAllowedDeviation;
}

/**
 * The full snapshot of "what the bank policy expected for this product
 * at this principal" — used both as the smart-default suggestion and
 * for the deviation audit (so compliance can report "AO overrode the
 * notarial fee on X% of loans last quarter").
 */
export interface ExpectedFeesSnapshot {
    notarialFee: number;
    docStamps: number;
    insurance: number;
}

export function computeExpectedFees(
    product: LoanProductResponse | null | undefined,
    principal: number
): ExpectedFeesSnapshot {
    return {
        notarialFee: computeStandardFee(findFeeRule(product, "NOTARIAL_FEE")!, principal),
        docStamps: computeStandardFee(findFeeRule(product, "DOC_STAMPS")!, principal),
        insurance: computeStandardFee(findFeeRule(product, "INSURANCE")!, principal),
    };
}
