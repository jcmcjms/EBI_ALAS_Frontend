/**
 * Loan fee computation — mirrors LoanFeeRules.cs on the backend.
 *
 * Both frontend and backend need the same fee values:
 * frontend for smart defaults, backend for re-validation.
 *
 * Note: Earlier `fees[]` array with FLAT/PERCENTAGE types never existed
 * in the deployed backend. This file mirrors the actual flat-column contract.
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

/** Returns a single fee from a product, rounded to 2dp. */
export function computeStandardFee(
    fee: { notarialFee: number } | { docStampFee: number } | { insuranceFee: number } | number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _principal: number
): number {
    // Tolerate raw number or partial product row.
    if (typeof fee === "number") return roundCurrency(fee);
    if ("notarialFee" in fee) return roundCurrency(fee.notarialFee);
    if ("docStampFee" in fee) return roundCurrency(fee.docStampFee);
    if ("insuranceFee" in fee) return roundCurrency(fee.insuranceFee);
    return 0;
}

/**
 * Standard fee snapshot from product policy. Used for smart defaults
 * and deviation tracking (e.g., "AO overrode notarial fee on X% of loans").
 */
export interface ExpectedFeesSnapshot {
    notarialFee: number;
    docStamps: number;
    insurance: number;
}

export function computeExpectedFees(
    product: LoanProductResponse | null | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
